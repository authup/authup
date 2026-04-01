/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { VaultClient } from '@authup/server-kit';
import { createVaultClient, setVaultFactory } from '@authup/server-kit';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { VaultInjectionKey } from './constants.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IContainer } from 'eldin';

export class VaultModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.VAULT;
        this.dependencies = [ModuleName.CONFIG];
    }

    async setup(container: IContainer): Promise<void> {
        const result = container.tryResolve(ConfigInjectionKey);
        if (!result.success || !result.data.vault) {
            return;
        }

        container.register(VaultInjectionKey, { useFactory: () => this.createClient(result.data.vault) });

        // todo: remove this
        setVaultFactory(() => this.createClient(result.data.vault));
    }

    // ----------------------------------------------------

    protected createClient(data: string | boolean) : VaultClient {
        if (typeof data === 'boolean') {
            return createVaultClient({ connectionString: 'start123@http://127.0.0.1:8090/v1/' });
        }

        return createVaultClient({ connectionString: data });
    }
}
