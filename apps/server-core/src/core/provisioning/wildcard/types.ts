/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type { RealmProvisioningEntity, RealmProvisioningRelations } from '../entities/index.ts';
import type { IProvisioningSynchronizer } from '../types.ts';

export type WildcardRealmProvisionerContext = {
    /**
     * The folded wildcard entry's relations, applied to realms without an
     * explicit realm block.
     */
    relations: RealmProvisioningRelations,

    /**
     * Merged relations (wildcard deep-merged UNDER the explicit block) per
     * canonical realm name, for realms the loaded config declares
     * explicitly. Applied when such a realm is (re-)created at runtime.
     */
    relationsByRealmName?: Map<string, RealmProvisioningRelations>,

    synchronizer: IProvisioningSynchronizer<RealmProvisioningEntity>,

    logger?: Logger,
};
