/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ConfigReadFsOptions = {
    cwd?: string,
    file?: string | string[]
};

export type ConfigRawReadOptions = {
    fs?: boolean | ConfigReadFsOptions,
    env?: boolean,
};
