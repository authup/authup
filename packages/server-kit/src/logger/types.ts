/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface LoggerLevelFn<OUT = any> {
    (message: string, ...meta: any[]): OUT;
    (message: any): OUT;
}

export type Logger = {
    error: LoggerLevelFn,
    warn: LoggerLevelFn,
    info: LoggerLevelFn,
    http: LoggerLevelFn,
    verbose: LoggerLevelFn,
    debug: LoggerLevelFn,
};

export type LoggerCreateContext = {
    env: string
    directory?: string
};
