/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import * as process from 'node:process';
import type { LoggerOptions } from 'winston';
import { createLogger as create, format, transports } from 'winston';
import type { Logger, LoggerCreateContext } from './types';

export function createLogger(context: LoggerCreateContext) : Logger {
    let items : LoggerOptions['transports'];

    const cwd = context.directory || process.cwd();

    if (context.env === 'production') {
        items = [
            new transports.Console({
                level: 'info',
            }),
            new transports.File({
                filename: path.join(cwd, 'access.log'),
                level: 'http',
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
            }),
            new transports.File({
                filename: path.join(cwd, 'error.log'),
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
            format.errors({ stack: true }),
            format.timestamp(),
            format.colorize(),
            format.simple(),
        ),
        transports: items,
    });
}
