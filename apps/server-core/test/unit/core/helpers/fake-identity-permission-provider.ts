/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { IdentityCredentialOptions, IdentityPolicyData, PermissionPolicyBinding } from '@authup/access';
import { RealmScope } from '@authup/access';
import type {
    IIdentityPermissionProvider,
    ResolveJunctionGrantResult,
    ResolveJunctionPolicyOptions,
} from '../../../../src/core/identity/permission/types.ts';

export class FakeIdentityPermissionProvider implements IIdentityPermissionProvider {
    private supersetResult = true;

    private bindings: PermissionPolicyBinding[] = [];

    private junctionPolicy: Policy | undefined;

    // Mirror the production no-match default (RealmScope.OWN, fail-closed) so a test
    // that forgets to configure the grant still exercises the capped path.
    private junctionScope: `${RealmScope}` = RealmScope.OWN;

    setSuperset(value: boolean) {
        this.supersetResult = value;
    }

    setBindings(bindings: PermissionPolicyBinding[]) {
        this.bindings = bindings;
    }

    setJunctionPolicy(policy: Policy | undefined) {
        this.junctionPolicy = policy;
    }

    setJunctionRealmScope(scope: `${RealmScope}`) {
        this.junctionScope = scope;
    }

    public credentialOptions: IdentityCredentialOptions[] = [];

    async getFor(_identity: IdentityPolicyData, options: IdentityCredentialOptions): Promise<PermissionPolicyBinding[]> {
        this.credentialOptions.push(options);
        return this.bindings;
    }

    async isSuperset(
        _parent: IdentityPolicyData,
        _child: IdentityPolicyData,
        options: IdentityCredentialOptions,
    ): Promise<boolean> {
        this.credentialOptions.push(options);
        return this.supersetResult;
    }

    async resolveJunctionGrant(
        _identity: IdentityPolicyData,
        options: ResolveJunctionPolicyOptions,
    ): Promise<ResolveJunctionGrantResult> {
        this.credentialOptions.push({ credentialClientId: options.credentialClientId });
        return {
            policy: this.junctionPolicy,
            realmScope: this.junctionScope,
        };
    }
}
