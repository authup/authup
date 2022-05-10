/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type DatabaseSeedOptions = {
    admin: {
        username: string,
        password: string
        passwordReset?: boolean
    },

    robot: {
        enabled: boolean,
        secret?: string,
        secretReset?: boolean
    },

    permissions?: string[],
};

export type DatabaseOptions = {
    seed: DatabaseSeedOptions,
    alias?: string
};
