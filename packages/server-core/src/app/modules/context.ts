/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import type { IServer } from '../../adapters/http';
import type { Config } from '../../config';

export type ModuleContext = {
    config: Config,
    logger: Logger,
    dataSource: DataSource,
    httpServer: IServer
};

export class ModuleContextContainer {
    protected instances : Partial<ModuleContext>;

    // ----------------------------------------------------

    constructor() {
        this.instances = {};
    }

    // ----------------------------------------------------

    require<T extends keyof ModuleContext>(key: T) : ModuleContext[T] {
        const instance = this.instances[key];

        if (typeof instance === 'undefined') {
            throw new AuthupError(`${key} is no initialized.`);
        }

        return instance;
    }

    // ----------------------------------------------------

    register<T extends keyof ModuleContext>(key: T, value: ModuleContext[T]) : void {
        this.instances[key] = value;
    }

    unregister<T extends keyof ModuleContext>(key: T) : void {
        delete this.instances[key];
    }
}
