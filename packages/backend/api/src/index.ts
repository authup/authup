#!/usr/bin/env node

/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import 'reflect-metadata';
import yargs from 'yargs';
import dotenv from 'dotenv';
import { MigrationGenerateCommand } from './commands/migration-generate';
import { MigrationRevertCommand } from './commands/migration-revert';
import { MigrationStatusCommand } from './commands/migration-status';
import { ResetCommand } from './commands/reset';
import { SetupCommand } from './commands/setup';
import { UpgradeCommand } from './commands/upgrade';
import { StartCommand } from './commands/start';

dotenv.config();

// eslint-disable-next-line no-unused-expressions,@typescript-eslint/no-unused-expressions
yargs
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1)
    .command(new MigrationGenerateCommand())
    .command(new MigrationRevertCommand())
    .command(new MigrationStatusCommand())
    .command(new ResetCommand())
    .command(new SetupCommand())
    .command(new StartCommand())
    .command(new UpgradeCommand())
    .strict()
    .alias('v', 'version')
    .help('h')
    .alias('h', 'help')
    .argv;
