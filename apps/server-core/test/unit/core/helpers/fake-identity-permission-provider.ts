/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { IdentityPolicyData, PermissionPolicyBinding } from '@authup/access';
import type {
    IIdentityPermissionProvider,
    ResolveJunctionPolicyOptions,
} from '../../../../src/core/identity/permission/types.ts';

export class FakeIdentityPermissionProvider implements IIdentityPermissionProvider {
    private supersetResult = true;

    private bindings: PermissionPolicyBinding[] = [];

    private junctionPolicy: Policy | undefined;

    setSuperset(value: boolean) {
        this.supersetResult = value;
    }

    setBindings(bindings: PermissionPolicyBinding[]) {
        this.bindings = bindings;
    }

    setJunctionPolicy(policy: Policy | undefined) {
        this.junctionPolicy = policy;
    }

    async getFor(_identity: IdentityPolicyData): Promise<PermissionPolicyBinding[]> {
        return this.bindings;
    }

    async isSuperset(_parent: IdentityPolicyData, _child: IdentityPolicyData): Promise<boolean> {
        return this.supersetResult;
    }

    async resolveJunctionPolicy(
        _identity: IdentityPolicyData,
        _options: ResolveJunctionPolicyOptions,
    ): Promise<Policy | undefined> {
        return this.junctionPolicy;
    }
}
