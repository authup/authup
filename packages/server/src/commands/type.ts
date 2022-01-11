/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from '../config';

export type ServerContext = {
    config?: Config,
    extendDatabaseConnection?: boolean
};

export type ServerStartContext = ServerContext;

export type ServerSetupContext = ServerContext & {
    keyPair: boolean,
    database: boolean,
    databaseSeeder: boolean,
    documentation: boolean
};

export type ServerUpgradeContext = ServerContext;

export type ServerResetContext = ServerContext;
