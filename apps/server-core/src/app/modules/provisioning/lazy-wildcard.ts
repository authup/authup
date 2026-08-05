/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { IContainer } from 'eldin';
import type { IRealmProvisioner } from '../../../core/index.ts';
import { ProvisioningInjectionKey } from './constants.ts';

/**
 * The wildcard realm provisioner is registered by ProvisionerModule AFTER
 * the async provisioning-source load, and the HTTP module does not depend
 * on the provisioning module's boot order — resolve it lazily at request
 * time. No wildcard entry declared => no-op.
 */
export class LazyWildcardRealmProvisioner implements IRealmProvisioner {
    protected container: IContainer;

    constructor(container: IContainer) {
        this.container = container;
    }

    async ensureForRealm(realm: Realm): Promise<void> {
        if (this.container.has(ProvisioningInjectionKey.WildcardRealmProvisioner)) {
            await this.container
                .resolve(ProvisioningInjectionKey.WildcardRealmProvisioner)
                .ensureForRealm(realm);
        }
    }
}
