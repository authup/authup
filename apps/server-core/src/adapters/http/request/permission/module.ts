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
        const scopes = useRequestScopes(this.event);
        const identity = useRequestIdentity(this.event);

        // Only attach the identity policy data when an identity was actually
        // resolved. Setting it to `undefined` would still make
        // `PolicyData.has('identity')` true (key presence), so the built-in
        // identity evaluator would run its validator against `undefined` and
        // throw an uncaught error instead of a clean permission denial — see
        // the deleted-subject edge case in issue #3184.
        if (scopes.includes(ScopeName.GLOBAL) && identity) {
            ctx.data = ctx.data || new PolicyData();
            ctx.data.set(BuiltInPolicyType.IDENTITY, identity);
        }

        return ctx;
    }
}
