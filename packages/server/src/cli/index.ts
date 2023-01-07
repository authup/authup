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
import {
    HealthCheckCommand,
    MigrationGenerateCommand,
    MigrationRevertCommand,
    MigrationStatusCommand,
    ResetCommand,
    SetupCommand,
    StartCommand,
    UpgradeCommand,
} from './commands';

dotenv.config();

// eslint-disable-next-line no-unused-expressions,@typescript-eslint/no-unused-expressions
yargs
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1)
    .command(new HealthCheckCommand())
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
