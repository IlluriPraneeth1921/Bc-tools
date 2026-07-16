import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import { Construct } from 'constructs';

export interface PlTestStackProps extends cdk.StackProps {
  /** Environment name (e.g., 'qc', 'qc-phi') — used for unique resource naming */
  envName: string;
  /** VPC ID to deploy into */
  vpcId: string;
  /** Availability zones for the VPC */
  availabilityZones: string[];
  /** Private subnet IDs (at least 2) */
  privateSubnetIds: string[];
  /** S3 bucket name for test .psv files */
  s3BucketName: string;
  /** S3 prefix for test files */
  s3TestFilePrefix?: string;
  /** DB server hostname */
  dbServer: string;
  /** Interface DB name (Stages 1-3) */
  interfaceDbName: string;
  /** Carity DB name (Stage 4) */
  carityDbName: string;
  /** DB username */
  dbUsername: string;
  /** MCD ID prefix for data isolation */
  mcdIdPrefix?: string;
  /** RDS Security Group IDs — override auto-lookup if provided */
  rdsSecurityGroupIds?: string[];
}

export class PlTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PlTestStackProps) {
    super(scope, id, props);

    const s3Prefix = props.s3TestFilePrefix || 'test-files/';
    const mcdIdPrefix = props.mcdIdPrefix || '000000000';
    const envName = props.envName;
    const serviceName = `pl-test-${envName}`;

    // =========================================================================
    // VPC — Use existing VPC
    // =========================================================================
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: props.vpcId,
      availabilityZones: props.availabilityZones,
      privateSubnetIds: props.privateSubnetIds,
    });

    // =========================================================================
    // Secrets Manager — Database credentials
    // Look up existing secret (password is managed manually, not auto-generated)
    // =========================================================================
    const dbSecret = secretsmanager.Secret.fromSecretNameV2(this, 'DbCredentials', 'pl-test/db-credentials');

    const appSecret = secretsmanager.Secret.fromSecretNameV2(this, 'AppCredentials', 'pl-test/app-credentials');

    // =========================================================================
    // ECS Cluster
    // =========================================================================
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `${serviceName}-cluster`,
      containerInsights: true,
    });

    // =========================================================================
    // Task Definition — X86_64
    // =========================================================================
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // Grant access to secrets
    dbSecret.grantRead(taskDef.taskRole);
    appSecret.grantRead(taskDef.taskRole);

    // Grant S3 read/write access for test files bucket
    const testFilesBucket = cdk.aws_s3.Bucket.fromBucketName(this, 'TestFilesBucket', props.s3BucketName);
    testFilesBucket.grantReadWrite(taskDef.taskRole);

    // Container image — Use pre-built ECR image if IMAGE_TAG is set, otherwise build from source
    const imageTag = process.env.IMAGE_TAG || '';
    const ecrAccount = process.env.CDK_DEFAULT_ACCOUNT || cdk.Aws.ACCOUNT_ID;
    const ecrRegion = process.env.CDK_DEFAULT_REGION || 'us-east-1';
    const ecrRepoName = 'pl-test';

    const workspaceRoot = path.resolve(__dirname, '..', '..', '..');

    const containerImage = imageTag
      ? ecs.ContainerImage.fromRegistry(
          `${ecrAccount}.dkr.ecr.${ecrRegion}.amazonaws.com/${ecrRepoName}:${imageTag}`
        )
      : ecs.ContainerImage.fromAsset(workspaceRoot, {
          file: 'deploy/Dockerfile',
          platform: ecr_assets.Platform.LINUX_AMD64,
          // Exclude heavy directories to speed up CDK asset fingerprinting
          exclude: ['.venv', '.git', 'node_modules', '__pycache__', 'deploy/cdk/node_modules', 'deploy/cdk/cdk.out', '.kiro', 'cdk.out', '.cdk.out', '*.pyc', 'tests'],
        });

    // Container definition
    const container = taskDef.addContainer('PlTestContainer', {
      image: containerImage,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'pl-test',
        logGroup: new logs.LogGroup(this, 'LogGroup', {
          logGroupName: `/ecs/${serviceName}`,
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      environment: {
        PL_TEST_API_URL: 'http://localhost:8000',
        MCD_ID_PREFIX: mcdIdPrefix,
        DB_USE_TRUSTED_CONNECTION: 'false',
        S3_BUCKET_NAME: props.s3BucketName,
        S3_TEST_FILE_PREFIX: s3Prefix,
        AWS_REGION: this.region,
      },
      secrets: {
        DB_SERVER: ecs.Secret.fromSecretsManager(dbSecret, 'server'),
        DB_USERNAME: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
        INTERFACE_DB_NAME: ecs.Secret.fromSecretsManager(dbSecret, 'interfaceDb'),
        CARITY_DB_NAME: ecs.Secret.fromSecretsManager(dbSecret, 'carityDb'),
        PL_TEST_USERNAME: ecs.Secret.fromSecretsManager(appSecret, 'username'),
        PL_TEST_PASSWORD: ecs.Secret.fromSecretsManager(appSecret, 'password'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:8000/health || exit 1'],
        interval: cdk.Duration.seconds(10),
        timeout: cdk.Duration.seconds(3),
        retries: 2,
        startPeriod: cdk.Duration.seconds(15),
      },
    });

    // Port mappings
    container.addPortMappings(
      { containerPort: 8000, protocol: ecs.Protocol.TCP },  // FastAPI
      { containerPort: 8501, protocol: ecs.Protocol.TCP },  // Streamlit
    );

    // =========================================================================
    // Fargate Service
    // =========================================================================
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      serviceName: `${serviceName}-service`,
      assignPublicIp: false,
      circuitBreaker: { enable: true, rollback: true },
      healthCheckGracePeriod: cdk.Duration.seconds(30),
    });

    // =========================================================================
    // Application Load Balancer (internal)
    // =========================================================================
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: false,
      loadBalancerName: `${serviceName}-alb`,
    });

    // Listener for Streamlit (port 80 → 8501)
    const listener = alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    listener.addTargets('StreamlitTarget', {
      port: 8501,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service.loadBalancerTarget({
        containerName: 'PlTestContainer',
        containerPort: 8501,
      })],
      deregistrationDelay: cdk.Duration.seconds(10),
      healthCheck: {
        path: '/health',
        port: '8000',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(10),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
      },
    });

    // Listener for FastAPI (port 8000 → 8000)
    const apiListener = alb.addListener('ApiListener', {
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    apiListener.addTargets('ApiTarget', {
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service.loadBalancerTarget({
        containerName: 'PlTestContainer',
        containerPort: 8000,
      })],
      deregistrationDelay: cdk.Duration.seconds(10),
      healthCheck: {
        path: '/health',
        port: '8000',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(10),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
      },
    });

    // =========================================================================
    // Security Group — RDS Access (port 1433)
    // =========================================================================
    // Allow ECS service outbound to RDS
    service.connections.allowToAnyIpv4(ec2.Port.tcp(1433), 'Allow SQL Server access');

    // Add inbound rule on RDS security groups so RDS accepts traffic from ECS
    if (props.rdsSecurityGroupIds && props.rdsSecurityGroupIds.length > 0) {
      props.rdsSecurityGroupIds.forEach((sgId, index) => {
        const rdsSg = ec2.SecurityGroup.fromSecurityGroupId(this, `RdsSecurityGroup${index}`, sgId);
        rdsSg.addIngressRule(
          service.connections.securityGroups[0],
          ec2.Port.tcp(1433),
          `Allow inbound from ${serviceName} ECS service`,
        );
      });
    }

    // =========================================================================
    // Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'StreamlitUrl', {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'Streamlit Web UI URL',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `http://${alb.loadBalancerDnsName}:8000`,
      description: 'FastAPI Backend URL',
    });

    new cdk.CfnOutput(this, 'DbSecretName', {
      value: 'pl-test/db-credentials',
      description: 'Secret name for database credentials in Secrets Manager',
    });

    new cdk.CfnOutput(this, 'AppSecretName', {
      value: 'pl-test/app-credentials',
      description: 'Secret name for app login credentials in Secrets Manager',
    });

    new cdk.CfnOutput(this, 'EcsServiceSecurityGroup', {
      value: service.connections.securityGroups[0].securityGroupId,
      description: 'Security Group ID of the ECS service (add to RDS inbound rules)',
    });
  }
}
