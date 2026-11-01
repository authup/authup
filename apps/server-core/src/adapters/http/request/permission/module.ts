/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type {
    IPermissionEvaluator,
    IdentityPolicyData,
    PermissionCompileContext,
    PermissionCompileResult,
    PermissionEvaluationContext,
    PermissionPolicyBinding,
} from '@authup/access';
import {
    BuiltInPolicyType,
    PolicyData,
} from '@authup/access';
import type { IAppEvent } from 'routup';
import type { RequestIdentity } from '../helpers/index.ts';
import { useRequestGrants, useRequestIdentity, useRequestScopes } from '../helpers/index.ts';

export class RequestPermissionEvaluator implements IPermissionEvaluator {
    protected event: IAppEvent;

    protected evaluator: IPermissionEvaluator;

    constructor(event: IAppEvent, evaluator: IPermissionEvaluator) {
        this.event = event;
        this.evaluator = evaluator;
    }

    // --------------------------------------------------------------

    async evaluate(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluator.evaluate(await this.extendContext(ctx));
    }

    async preEvaluate(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluator.preEvaluate(await this.extendContext(ctx));
    }

    // --------------------------------------------------------------

    async preEvaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluator.preEvaluateOneOf(await this.extendContext(ctx));
    }

    async evaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluator.evaluateOneOf(await this.extendContext(ctx));
    }

    // --------------------------------------------------------------

    async compile(ctx: PermissionCompileContext) : Promise<PermissionCompileResult> {
        return this.evaluator.compile(await this.extendContext(ctx));
    }

    // --------------------------------------------------------------

    protected async extendContext<T extends PermissionEvaluationContext | PermissionCompileContext>(ctx: T) : Promise<T> {
        const identity = useRequestPolicyIdentity(this.event);

        if (identity) {
            // The grants travel with the identity they belong to, loaded here
            // rather than inside the engine: a failed load then fails the
            // request as itself, where the engine would flatten it into a
            // permission denial. The load is the request's own (#3597), so a
            // token's grants stay narrowed to its client, and scope-gated, so
            // a token without `global` evaluates as its identity holding none.
            const grants = await useRequestPolicyGrants(this.event, identity);

            ctx.data = ctx.data || new PolicyData();
            // a plain object: RequestIdentity exposes its fields as getters,
            // which a spread would drop. Always overwritten, never merged: a
            // caller may place an identity in the bag itself (the batch
            // authorization check does), and only the request's own identity,
            // carrying only the grants its scopes allow, may survive that.
            ctx.data.set(BuiltInPolicyType.IDENTITY, {
                type: identity.type,
                id: identity.id,
                clientId: identity.clientId,
                realmId: identity.realmId,
                realmName: identity.realmName,
                grants,
            });

            return ctx;
        }

        // No identity was resolved (an anonymous request), so none may be
        // evaluated: a caller-placed one is removed, grants and all.
        if (ctx.data) {
            ctx.data.delete(BuiltInPolicyType.IDENTITY);
        }

        return ctx;
    }
}

/**
 * The identity a policy may see for this request: its own, whenever one was
 * resolved. A token's scopes never hide WHO is asking; they restrict WHAT the
 * identity may do, which `useRequestPolicyGrants` decides.
 */
export function useRequestPolicyIdentity(event: IAppEvent) : RequestIdentity | undefined {
    // Only an identity that was actually resolved. Setting `undefined` would
    // still make `PolicyData.has('identity')` true (key presence), so the
    // built-in identity evaluator would run its validator against `undefined`
    // and throw an uncaught error instead of a clean permission denial (the
    // deleted-subject edge case in issue #3184).
    return useRequestIdentity(event) || undefined;
}

/**
 * The grants the request's own identity may exercise: what its token carries
 * when the scopes include `global`, none otherwise. The ONE place that
 * condition is spelled: `RequestPermissionEvaluator` applies it on every
 * evaluation, `buildActorContext` hands it to the services that delegate the
 * actor's grants, and the batch authorization check and
 * `POST /{permissions,policies}/:id/check` (#3604) evaluate the actor through
 * it. Without `global` the identity still resolves, so identity-reading
 * policies see who is asking, but every grant-bound permission denies.
 */
export async function useRequestPolicyGrants(
    event: IAppEvent,
    identity: Pick<IdentityPolicyData, 'type' | 'id'>,
) : Promise<PermissionPolicyBinding[]> {
    if (!useRequestScopes(event).includes(ScopeName.GLOBAL)) {
        return [];
    }

    return useRequestGrants(event, identity);
}
