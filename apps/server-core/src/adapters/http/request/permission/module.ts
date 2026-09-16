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
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import type { IAppEvent } from 'routup';
import { useRequestIdentity, useRequestScopes } from '../helpers/index.ts';

export class RequestPermissionEvaluator implements IPermissionEvaluator {
    protected event: IAppEvent;

    protected evaluator: IPermissionEvaluator;

    constructor(event: IAppEvent, evaluator: IPermissionEvaluator) {
        this.event = event;
        this.evaluator = evaluator;
    }

    // --------------------------------------------------------------

    async evaluate(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluator.evaluate(this.extendContext(ctx));
    }

    async preEvaluate(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluator.preEvaluate(this.extendContext(ctx));
    }

    // --------------------------------------------------------------

    async preEvaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluator.preEvaluateOneOf(this.extendContext(ctx));
    }

    async evaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluator.evaluateOneOf(this.extendContext(ctx));
    }

    // --------------------------------------------------------------

    async compile(ctx: PermissionCompileContext) : Promise<PermissionCompileResult> {
        return this.evaluator.compile(this.extendContext(ctx));
    }

    // --------------------------------------------------------------

    protected extendContext<T extends PermissionEvaluationContext | PermissionCompileContext>(ctx: T) : T {
        ctx.data = applyRequestIdentity(this.event, ctx.data || new PolicyData());

        return ctx;
    }
}

/**
 * The ONE place the `global`-scope condition is spelled. Every evaluation
 * through `RequestPermissionEvaluator` passes its bag here, and so does
 * `POST /policies/:id/check`, which evaluates a policy with the engine and has
 * no permission evaluator to route through.
 *
 * Symmetrical: the identity is the request's own when the scopes include
 * `global`, overwriting whatever a caller placed, and absent otherwise. An
 * attach-only version held the gate only for a caller that left the key empty,
 * and a caller-named identity is what the permission-binding evaluator loads
 * grants for, so honouring one answers for another subject (#3604).
 */
export function applyRequestIdentity(event: IAppEvent, data: PolicyData) : PolicyData {
    const identity = useRequestIdentity(event);

    // Only attach the identity policy data when an identity was actually
    // resolved. Setting it to `undefined` would still make
    // `PolicyData.has('identity')` true (key presence), so the built-in
    // identity evaluator would run its validator against `undefined` and
    // throw an uncaught error instead of a clean permission denial (the
    // deleted-subject edge case in issue #3184).
    if (identity && useRequestScopes(event).includes(ScopeName.GLOBAL)) {
        data.set(BuiltInPolicyType.IDENTITY, identity);
    } else {
        data.delete(BuiltInPolicyType.IDENTITY);
    }

    return data;
}
