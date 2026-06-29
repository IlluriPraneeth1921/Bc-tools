#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';
import { PlTestStack } from '../lib/pl-test-stack';

const app = new cdk.App();

// ============================================================================
// Environment selection — pass via: npx cdk deploy -c env=qc
// ============================================================================
const envName = app.node.tryGetContext('env');
if (!envName) {
  throw new Error(
    'Missing required context: env.\n' +
    'Usage: npx cdk deploy -c env=<environment>\n' +
    'Available environments: ' + listAvailableEnvironments().join(', ')
  );
}

const envConfigPath = path.resolve(__dirname, '..', 'environments', `${envName}.json`);
if (!fs.existsSync(envConfigPath)) {
  throw new Error(
    `Environment config not found: environments/${envName}.json\n` +
    'Available environments: ' + listAvailableEnvironments().join(', ')
  );
}

const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf-8'));

// ============================================================================
// Configuration — environment file values can be overridden via -c flags
// ============================================================================
function resolve(key: string, fallback?: string): string {
  return app.node.tryGetContext(key) || envConfig[key] || fallback || '';
}

function resolveArray(key: string): string[] {
  const ctxValue = app.node.tryGetContext(key);
  if (ctxValue) return Array.isArray(ctxValue) ? ctxValue : [ctxValue];
  return envConfig[key] || [];
}

const vpcId = resolve('vpcId');
const availabilityZones = resolveArray('availabilityZones');
const privateSubnetIds = resolveArray('privateSubnetIds');
const s3BucketName = resolve('s3BucketName');
const s3TestFilePrefix = resolve('s3TestFilePrefix', 'test-files/');
const dbServer = resolve('dbServer');
const interfaceDbName = resolve('interfaceDbName');
const carityDbName = resolve('carityDbName');
const dbUsername = resolve('dbUsername');
const mcdIdPrefix = resolve('mcdIdPrefix', '000000000');
const rdsSecurityGroupIds = resolveArray('rdsSecurityGroupIds');

// Tagging
const stage = resolve('stage', 'dev');
const SERVICE_NAME = resolve('serviceName', 'pl-test');
const customer = resolve('customer', 'widhs');

// Validate required values
const missing: string[] = [];
if (!vpcId) missing.push('vpcId');
if (!availabilityZones.length) missing.push('availabilityZones');
if (!privateSubnetIds.length) missing.push('privateSubnetIds');
if (!s3BucketName) missing.push('s3BucketName');
if (!dbServer) missing.push('dbServer');
if (!interfaceDbName) missing.push('interfaceDbName');
if (!carityDbName) missing.push('carityDbName');
if (!dbUsername) missing.push('dbUsername');

if (missing.length > 0) {
  throw new Error(
    `Missing required config values in environments/${envName}.json: ${missing.join(', ')}.\n` +
    `Add them to the environment file or pass via -c flag.`
  );
}

// ============================================================================
// Stack
// ============================================================================
const stack = new PlTestStack(app, `PlTestStack-${envName}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: `pl-test: Data Pipeline Verification Tool [${envName}]`,

  envName,
  vpcId,
  availabilityZones,
  privateSubnetIds,
  s3BucketName,
  s3TestFilePrefix,
  dbServer,
  interfaceDbName,
  carityDbName,
  dbUsername,
  mcdIdPrefix,
  rdsSecurityGroupIds: rdsSecurityGroupIds.length > 0 ? rdsSecurityGroupIds : undefined,
});

// Apply tags to all resources in the stack
Tags.of(stack).add('bc:stage', stage);
Tags.of(stack).add('bc:service', SERVICE_NAME);
Tags.of(stack).add('bc:customer', customer);

// ============================================================================
// Helpers
// ============================================================================
function listAvailableEnvironments(): string[] {
  const envsDir = path.resolve(__dirname, '..', 'environments');
  if (!fs.existsSync(envsDir)) return [];
  return fs.readdirSync(envsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}
