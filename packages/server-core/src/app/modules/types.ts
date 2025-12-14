/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import type { IServer } from '../../adapters/http';
import type { Config } from '../../config';

export interface ApplicationModule {
    start() : Promise<void>;

    stop?(): Promise<void>
}

export type ApplicationModuleContext = {
    config: Config,
    logger: Logger,
    dataSource: DataSource,
    httpServer: IServer
};
