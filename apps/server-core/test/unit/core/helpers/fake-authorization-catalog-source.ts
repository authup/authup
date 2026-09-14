/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '@authup/access';
import type {
    IAuthorizationCatalogSource,
    PermissionPolicies,
} from '../../../../src/core/authorization/types.ts';

export class FakeAuthorizationCatalogSource implements IAuthorizationCatalogSource {
    private definitions: PermissionPolicies[] = [];

    private grantPolicies: BasePolicy[] = [];

    setDefinitions(definitions: PermissionPolicies[]) {
        this.definitions = definitions;
    }

    setGrantPolicies(policies: BasePolicy[]) {
        this.grantPolicies = policies;
    }

    async findDefinitions(): Promise<PermissionPolicies[]> {
        return this.definitions;
    }

    async findGrantPolicies(): Promise<BasePolicy[]> {
        return this.grantPolicies;
    }
}
