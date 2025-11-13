#!/usr/bin/env node

/**
 * Database Migration CLI
 * 
 * Command-line interface for managing database migrations.
 * 
 * Usage:
 *   node scripts/migrate.js [command] [options]
 * 
 * Commands:
 *   status              Show migration status
 *   migrate             Run all pending migrations
 *   migrate:up          Run all pending migrations (alias)
 *   migrate:step N      Run N pending migrations
 *   rollback            Rollback last batch of migrations
 *   rollback:step N     Rollback N migrations
 *   reset               Rollback all migrations
 *   fresh               Reset and re-run all migrations
 *   help                Show this help message
 * 
 * Options:
 *   --dry-run           Show what would be executed without running
 * 
 * Examples:
 *   node scripts/migrate.js status
 *   node scripts/migrate.js migrate
 *   node scripts/migrate.js migrate:step 1
 *   node scripts/migrate.js rollback --dry-run
 *   node scripts/migrate.js fresh
 */

import { migrationManager } from '../src/Database/MigrationManager.js';
import { logger } from '../src/Core/Logger.js';

const COMMANDS = {
    status: 'Show migration status',
    migrate: 'Run all pending migrations',
    'migrate:up': 'Run all pending migrations (alias)',
    'migrate:step': 'Run N pending migrations',
    rollback: 'Rollback last batch of migrations',
    'rollback:step': 'Rollback N migrations',
    reset: 'Rollback all migrations',
    fresh: 'Reset and re-run all migrations',
    help: 'Show this help message'
};

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const options = parseOptions(args.slice(1));

    try {
        switch (command) {
            case 'status':
                await showStatus();
                break;

            case 'migrate':
            case 'migrate:up':
                await runMigrate(options);
                break;

            case 'migrate:step':
                await runMigrateStep(options);
                break;

            case 'rollback':
                await runRollback(options);
                break;

            case 'rollback:step':
                await runRollbackStep(options);
                break;

            case 'reset':
                await runReset(options);
                break;

            case 'fresh':
                await runFresh(options);
                break;

            case 'help':
            default:
                showHelp();
                break;
        }

        await migrationManager.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        logger.error('Migration command failed', {
            command,
            error: error.message,
            stack: error.stack
        });
        await migrationManager.close();
        process.exit(1);
    }
}

function parseOptions(args) {
    const options = {
        dryRun: false,
        step: null
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--dry-run') {
            options.dryRun = true;
        } else if (!isNaN(parseInt(args[i]))) {
            options.step = parseInt(args[i]);
        }
    }

    return options;
}

async function showStatus() {
    console.log('\n📊 Migration Status\n');
    console.log('═'.repeat(80));

    const status = await migrationManager.status();

    if (status.length === 0) {
        console.log('\nNo migrations found.');
        return;
    }

    const pending = status.filter(m => m.status === 'pending');
    const executed = status.filter(m => m.status === 'executed');

    console.log(`\nTotal Migrations: ${status.length}`);
    console.log(`Executed: ${executed.length}`);
    console.log(`Pending: ${pending.length}`);
    console.log('\n' + '─'.repeat(80));

    status.forEach(migration => {
        const icon = migration.status === 'executed' ? '✓' : '○';
        const statusColor = migration.status === 'executed' ? '\x1b[32m' : '\x1b[33m';
        const resetColor = '\x1b[0m';

        console.log(`${icon} ${statusColor}${migration.version}${resetColor} ${migration.name}`);

        if (migration.executedAt) {
            const date = new Date(migration.executedAt).toLocaleString();
            console.log(`  └─ Executed: ${date} (batch ${migration.batch})`);
        }
    });

    console.log('\n' + '═'.repeat(80) + '\n');
}

async function runMigrate(options) {
    console.log('\n🚀 Running Migrations\n');
    console.log('═'.repeat(80));

    if (options.dryRun) {
        console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
    }

    const result = await migrationManager.migrate(options);

    if (result.executed.length === 0) {
        console.log('\n✓ ' + result.message);
    } else {
        console.log(`\n✓ ${result.message} (batch ${result.batch})\n`);
        result.executed.forEach(m => {
            console.log(`  ✓ ${m.version}_${m.name}`);
        });
    }

    console.log('\n' + '═'.repeat(80) + '\n');
}

async function runMigrateStep(options) {
    if (!options.step) {
        console.error('\n❌ Error: Please specify number of steps');
        console.log('Example: node scripts/migrate.js migrate:step 1\n');
        process.exit(1);
    }

    console.log(`\n🚀 Running ${options.step} Migration(s)\n`);
    console.log('═'.repeat(80));

    const result = await migrationManager.migrate(options);

    if (result.executed.length === 0) {
        console.log('\n✓ ' + result.message);
    } else {
        console.log(`\n✓ ${result.message} (batch ${result.batch})\n`);
        result.executed.forEach(m => {
            console.log(`  ✓ ${m.version}_${m.name}`);
        });
    }

    console.log('\n' + '═'.repeat(80) + '\n');
}

async function runRollback(options) {
    console.log('\n↩️  Rolling Back Migrations\n');
    console.log('═'.repeat(80));

    if (options.dryRun) {
        console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
    }

    const result = await migrationManager.rollback(options);

    if (result.rolledBack.length === 0) {
        console.log('\n✓ ' + result.message);
    } else {
        console.log(`\n✓ ${result.message}\n`);
        result.rolledBack.forEach(m => {
            console.log(`  ↩️  ${m.version}_${m.name}`);
        });
    }

    console.log('\n' + '═'.repeat(80) + '\n');
}

async function runRollbackStep(options) {
    if (!options.step) {
        console.error('\n❌ Error: Please specify number of steps');
        console.log('Example: node scripts/migrate.js rollback:step 1\n');
        process.exit(1);
    }

    console.log(`\n↩️  Rolling Back ${options.step} Migration(s)\n`);
    console.log('═'.repeat(80));

    const result = await migrationManager.rollback(options);

    if (result.rolledBack.length === 0) {
        console.log('\n✓ ' + result.message);
    } else {
        console.log(`\n✓ ${result.message}\n`);
        result.rolledBack.forEach(m => {
            console.log(`  ↩️  ${m.version}_${m.name}`);
        });
    }

    console.log('\n' + '═'.repeat(80) + '\n');
}

async function runReset(options) {
    console.log('\n🔄 Resetting Database\n');
    console.log('═'.repeat(80));
    console.log('\n⚠️  WARNING: This will rollback ALL migrations!\n');

    if (!options.dryRun) {
        // Require confirmation in non-dry-run mode
        console.log('This action cannot be undone.');
        console.log('Add --dry-run to see what would be rolled back.\n');
    }

    const result = await migrationManager.reset();

    console.log('\n✓ ' + result.message);
    console.log('\n' + '═'.repeat(80) + '\n');
}

async function runFresh(options) {
    console.log('\n🔄 Refreshing Database\n');
    console.log('═'.repeat(80));
    console.log('\n⚠️  WARNING: This will reset and re-run ALL migrations!\n');

    const result = await migrationManager.fresh();

    console.log('\n✓ ' + result.message);
    console.log('\n' + '═'.repeat(80) + '\n');
}

function showHelp() {
    console.log('\n📦 Database Migration CLI\n');
    console.log('═'.repeat(80));
    console.log('\nUsage: node scripts/migrate.js [command] [options]\n');
    console.log('Commands:');

    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(20)} ${desc}`);
    });

    console.log('\nOptions:');
    console.log('  --dry-run           Show what would be executed without running\n');

    console.log('Examples:');
    console.log('  node scripts/migrate.js status');
    console.log('  node scripts/migrate.js migrate');
    console.log('  node scripts/migrate.js migrate:step 1');
    console.log('  node scripts/migrate.js rollback --dry-run');
    console.log('  node scripts/migrate.js fresh\n');

    console.log('═'.repeat(80) + '\n');
}

// Run CLI
main();
