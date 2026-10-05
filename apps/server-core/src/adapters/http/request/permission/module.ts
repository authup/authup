/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type {
    IPermissionEvaluator,
    PermissionCompileContext,
    PermissionCompileResult,
    PermissionEvaluationContext,
} from '@authup/access';
import {
    BuiltInPolicyType,
    PolicyData,
    PolicyDataKey,
    defineIdentityGrants,
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
            // token's grants stay narrowed to its client.
            const grants = await useRequestGrants(this.event, identity);

            ctx.data = ctx.data || new PolicyData();
            ctx.data.set(BuiltInPolicyType.IDENTITY, identity);
            ctx.data.set(PolicyDataKey.GRANTS, defineIdentityGrants(identity, grants));

            return ctx;
        }

        // Symmetrical, so this is the ONE place the scope condition is spelled:
        // a caller may place an identity in the bag itself (the batch
        // authorization check does, so every identity-reading policy in a tree
        // gets it), and what the request was NOT resolved as must never survive
        // that. Without the removal the gate only held for a caller that
        // happened to leave the key empty, so placing it anywhere else silently
        // answered a scope-restricted bearer as a fully-scoped one.
        // The grants go with it: grants placed next to an identity this
        // request was not resolved as must not reach the binding evaluator.
        if (ctx.data) {
            ctx.data.delete(BuiltInPolicyType.IDENTITY);
            ctx.data.delete(PolicyDataKey.GRANTS);
        }

        return ctx;
    }
}

/**
 * The identity a policy may see for this request: its own when the scopes
 * include `global`, none otherwise. The ONE place that condition is spelled:
 * `RequestPermissionEvaluator` asserts it on every evaluation, and
 * `POST /policies/:id/check`, which runs the policy engine without a
 * permission evaluator, hands it to the checker as the caller (#3604).
 */
export function useRequestPolicyIdentity(event: IAppEvent) : RequestIdentity | undefined {
    const identity = useRequestIdentity(event);

    // Only an identity that was actually resolved. Setting `undefined` would
    // still make `PolicyData.has('identity')` true (key presence), so the
    // built-in identity evaluator would run its validator against `undefined`
    // and throw an uncaught error instead of a clean permission denial (the
    // deleted-subject edge case in issue #3184).
    if (identity && useRequestScopes(event).includes(ScopeName.GLOBAL)) {
        return identity;
    }

    return undefined;
}
