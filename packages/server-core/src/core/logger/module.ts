/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import type { Logger, LoggerOptions } from 'winston';
import path from 'node:path';
import { createLogger as create, format, transports } from 'winston';
import type { LoggerSetupContext } from './types';

export function createLogger(context: LoggerSetupContext) : Logger {
    const env = context.env || read('NODE_ENV');

    let items : LoggerOptions['transports'];

    if (env === 'production') {
        items = [
            new transports.Console({
                level: 'info',
            }),
            new transports.File({
                filename: path.join(context.directory, 'access.log'),
                level: 'http',
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
            }),
            new transports.File({
                filename: path.join(context.directory, 'error.log'),
                level: 'warn',
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
            }),
        ];
    } else {
        items = [
            new transports.Console({
                level: 'debug',
            }),
        ];
    }

    return create({
        format: format.combine(
            format.timestamp(),
            format.json(),
        ),
        transports: items,
    });
}
