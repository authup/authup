/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type LeveledLogMethod = {
    (message: string, ...meta: any[]): Logger;
    (message: any): Logger;
    [key: string]: any
};

export type Logger = {
    error: LeveledLogMethod,
    warn: LeveledLogMethod,
    info: LeveledLogMethod,
    debug: LeveledLogMethod,
    [key: string]: any
};
