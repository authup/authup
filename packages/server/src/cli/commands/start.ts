/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { DataSourceOptions } from 'typeorm';

import { createLogger, format, transports } from 'winston';
import path from 'path';
import {
    startCommand,
} from '../../commands';
import { applyConfig } from '../../config';
import { findConfig } from '../../config/utils/find';
import { buildDataSourceOptions } from '../../database/utils';

interface StartArguments extends Arguments {
    root: string;
}

export class StartCommand implements CommandModule {
    command = 'start';

    describe = 'Start the server.';

    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            });
    }

    async handler(args: StartArguments) {
        const config = findConfig(args.root);
        applyConfig(config);

        const dataSourceOptions = await buildDataSourceOptions();

        if (process.env.NODE_ENV === 'test') {
            Object.assign(dataSourceOptions, {
                migrations: [],
            } as DataSourceOptions);
        }

        const logger = createLogger({
            format: format.combine(
                format.timestamp(),
                format.json(),
            ),
            transports: [
                new transports.Console({
                    level: 'debug',
                }),
                new transports.File({
                    filename: path.join(config.core.writableDirectoryPath, 'error.log'),
                    level: 'warn',
                }),
            ],
        });

        try {
            await startCommand({
                logger,
                dataSourceOptions,
            });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);

            process.exit(1);
        }
    }
}
