/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { VaultClient } from '@authup/server-kit';
import {
    createVaultClient, setVaultFactory,
} from '@authup/server-kit';
import type { Module } from '../types.ts';
import { ModuleName } from '../constants.ts';
import { VaultInjectionKey } from './constants.ts';
import type { Config } from '../config/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IDIContainer } from '../../../core/index.ts';

export class VaultModule implements Module {
    readonly name: string;

    readonly dependsOn: string[];

    constructor() {
        this.name = ModuleName.VAULT;
        this.dependsOn = [ModuleName.CONFIG];
    }

    async start(container: IDIContainer): Promise<void> {
        const result = container.safeResolve<Config>(ConfigInjectionKey);
        if (!result.success || !result.data.vault) {
            return;
        }

        container.register(VaultInjectionKey, {
            useFactory: () => this.createClient(result.data.vault),
        });

        // todo: remove this
        setVaultFactory(() => this.createClient(result.data.vault));
    }

    // ----------------------------------------------------

    protected createClient(data: string | boolean) : VaultClient {
        if (typeof data === 'boolean') {
            return createVaultClient({
                connectionString: 'start123@http://127.0.0.1:8090/v1/',
            });
        }

        return createVaultClient({
            connectionString: data,
        });
    }
}
