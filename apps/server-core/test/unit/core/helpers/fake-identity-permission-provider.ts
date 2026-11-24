/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { PermissionPolicyBinding } from '@authup/access';
import { RealmScope } from '@authup/access';
import type {
    IIdentityPermissionProvider,
    IdentityPermissionSubject,
    IdentityToken,
    ManagedPermission,
    ResolveJunctionGrantResult,
    ResolveJunctionPolicyOptions,
    ResolveManagerGrantResult,
    SupersetActor,
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

    /**
     * The actor grants each delegation call was handed, in call order.
     */
    public delegatedGrants: PermissionPolicyBinding[][] = [];

    public getForCalls: IdentityPermissionSubject[] = [];

    public getForTokenCalls: IdentityToken[] = [];

    async getFor(identity: IdentityPermissionSubject): Promise<PermissionPolicyBinding[]> {
        this.getForCalls.push(identity);

        return this.bindings;
    }

    async getForToken(token: IdentityToken): Promise<PermissionPolicyBinding[]> {
        this.getForTokenCalls.push(token);

        return this.bindings;
    }

    /**
     * The actor each superset check was handed, in call order.
     */
    public supersetActors: SupersetActor[] = [];

    async isSuperset(
        parent: PermissionPolicyBinding[],
        _child: PermissionPolicyBinding[],
        actor: SupersetActor,
    ): Promise<boolean> {
        this.delegatedGrants.push(parent);
        this.supersetActors.push(actor);

        return this.supersetResult;
    }

    /**
     * Manages nothing, so a junction write runs the hold rule.
     */
    async resolveManagerGrant(
        _parent: PermissionPolicyBinding[],
        _permission: ManagedPermission,
        _actor: SupersetActor,
    ): Promise<ResolveManagerGrantResult | null> {
        return null;
    }

    async resolveJunctionGrant(
        bindings: PermissionPolicyBinding[],
        _options: ResolveJunctionPolicyOptions,
    ): Promise<ResolveJunctionGrantResult> {
        this.delegatedGrants.push(bindings);

        return {
            policy: this.junctionPolicy,
            realmScope: this.junctionScope,
        };
    }
}
