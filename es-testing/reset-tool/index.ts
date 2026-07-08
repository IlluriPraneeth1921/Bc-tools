#!/usr/bin/env npx ts-node
/**
 * Reset Tool — Interactive CLI for QA test data management.
 *
 * Allows QA staff to reset test persons to pristine state without
 * deploying stored procedures or managing connection strings.
 *
 * Usage:
 *   npx ts-node scripts/reset-tool/index.ts
 *   — or —
 *   npm run reset-tool
 */
import { select, input, password as passwordPrompt, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { loadConfig, saveConfig, isConfigured, ResetToolConfig } from './config';
import { connect, disconnect, getNativeDriverStatus, isUsingNativeDriver } from './db-connection';
import { runDryRun, runFullReset, runWipeOnly } from './reset-person';

async function main(): Promise<void> {
  console.log('');
  console.log(chalk.cyan.bold('╔══════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║     QA Test Data Reset Tool          ║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════╝'));
  console.log('');

  // Show auth method
  const nativeAvailable = getNativeDriverStatus();
  if (nativeAvailable) {
    console.log(chalk.green('✓ Windows Integrated Auth available (msnodesqlv8)'));
    console.log(chalk.gray('  Will use your current Windows session — no password needed.'));
  } else {
    console.log(chalk.yellow('⚠ msnodesqlv8 not available — using NTLM fallback'));
    console.log(chalk.gray('  You will need to enter your Windows domain credentials.'));
  }
  console.log('');

  // Load or create config
  let config = loadConfig();

  // If not configured, run setup
  if (!isConfigured(config)) {
    console.log(chalk.yellow('First-time setup — let\'s configure the tool.\n'));
    config = await runSetup(config);
  }

  // Main menu loop
  let running = true;
  while (running) {
    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: 'Full Reset (wipe + rebuild from blueprint)', value: 'full-reset' },
        { name: 'Wipe Only (delete enrollment/ISP data, no rebuild)', value: 'wipe-only' },
        { name: 'Dry Run (preview what would be affected)', value: 'dry-run' },
        { name: 'Configure (change server, database, blueprint)', value: 'configure' },
        { name: 'Exit', value: 'exit' },
      ],
    });

    switch (action) {
      case 'full-reset':
        await handleReset(config, 'full');
        break;
      case 'wipe-only':
        await handleReset(config, 'wipe');
        break;
      case 'dry-run':
        await handleReset(config, 'dry-run');
        break;
      case 'configure':
        config = await runSetup(config);
        break;
      case 'exit':
        running = false;
        break;
    }
  }

  await disconnect();
  console.log(chalk.gray('\nGoodbye.\n'));
}

/**
 * Prompt for setup/configuration values.
 */
async function runSetup(config: ResetToolConfig): Promise<ResetToolConfig> {
  console.log(chalk.cyan('\n— Configuration —\n'));

  config.server = await input({
    message: 'SQL Server hostname:',
    default: config.server || undefined,
  });

  config.database = await input({
    message: 'Database name:',
    default: config.database || undefined,
  });

  if (!getNativeDriverStatus()) {
    config.domain = await input({
      message: 'Windows domain (e.g. CORP):',
      default: config.domain || undefined,
    });

    config.username = await input({
      message: 'Windows username (without domain):',
      default: config.username || undefined,
    });
  }

  config.blueprintPersonKey = await input({
    message: 'Blueprint PersonKey (template to clone from):',
    default: config.blueprintPersonKey,
  });

  saveConfig(config);
  console.log(chalk.green('\n✓ Configuration saved to .reset-tool.json\n'));
  return config;
}

/**
 * Handle a reset operation (full, wipe, or dry-run).
 */
async function handleReset(config: ResetToolConfig, mode: 'full' | 'wipe' | 'dry-run'): Promise<void> {
  console.log('');

  // Get PersonKey
  const personKey = await input({
    message: 'Target PersonKey (GUID):',
    default: config.lastPersonKey || undefined,
    validate: (val) => {
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return guidRegex.test(val.trim()) || 'Please enter a valid GUID (e.g. c7a3862e-f166-466d-a5fb-b4670130aebd)';
    },
  });

  // Save last person key
  config.lastPersonKey = personKey.trim();
  saveConfig(config);

  // Connect
  try {
    console.log(chalk.gray('\nConnecting to database...'));

    let password: string | undefined;
    if (!getNativeDriverStatus()) {
      password = await passwordPrompt({
        message: `Password for ${config.domain}\\${config.username}:`,
        mask: '*',
      });
    }

    await connect({
      server: config.server,
      database: config.database,
      domain: config.domain || undefined,
      username: config.username || undefined,
      password: password || undefined,
    });

    const authMethod = isUsingNativeDriver() ? 'Windows Integrated' : 'NTLM';
    console.log(chalk.green(`✓ Connected to ${config.server}/${config.database} (${authMethod})\n`));
  } catch (err: any) {
    console.log(chalk.red(`\n✗ Connection failed: ${err.message}\n`));
    console.log(chalk.gray('  Check your server/database in configuration, and ensure you have access.\n'));
    return;
  }

  try {
    if (mode === 'dry-run') {
      await runDryRun(personKey.trim(), config.blueprintPersonKey);
    } else if (mode === 'wipe') {
      // Show dry run first
      await runDryRun(personKey.trim(), config.blueprintPersonKey);

      const proceed = await confirm({
        message: chalk.yellow('Proceed with WIPE ONLY? This will delete all enrollment and ISP data.'),
        default: false,
      });
      if (proceed) {
        await runWipeOnly(personKey.trim());
      } else {
        console.log(chalk.gray('  Cancelled.\n'));
      }
    } else {
      // Full reset — show dry run first
      await runDryRun(personKey.trim(), config.blueprintPersonKey);

      const proceed = await confirm({
        message: chalk.yellow('Proceed with FULL RESET? This will wipe and rebuild from blueprint.'),
        default: false,
      });
      if (proceed) {
        await runFullReset(personKey.trim(), config.blueprintPersonKey);
      } else {
        console.log(chalk.gray('  Cancelled.\n'));
      }
    }
  } catch (err: any) {
    console.log(chalk.red(`\n✗ Operation failed: ${err.message}\n`));
    if (err.message?.includes('transaction')) {
      console.log(chalk.gray('  The transaction was rolled back — no changes were made.\n'));
    }
  }
}

// Entry point
main().catch((err) => {
  console.error(chalk.red('Fatal error:'), err.message);
  process.exit(1);
});
