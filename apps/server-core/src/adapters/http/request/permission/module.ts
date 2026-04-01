/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type {
    IPermissionEvaluator,
    PermissionEvaluationContext,
} from '@authup/access';
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import type { Request } from 'routup';
import { useRequestIdentity, useRequestScopes } from '../helpers/index.ts';

export class RequestPermissionEvaluator implements IPermissionEvaluator {
    protected req: Request;

    protected evaluator: IPermissionEvaluator;

    constructor(req: Request, evaluator: IPermissionEvaluator) {
        this.req = req;
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

    protected extendContext(ctx: PermissionEvaluationContext) {
        const scopes = useRequestScopes(this.req);
        if (scopes.includes(ScopeName.GLOBAL)) {
            ctx.input = ctx.input || new PolicyData();
            ctx.input.set(BuiltInPolicyType.IDENTITY, useRequestIdentity(this.req));
        }

        return ctx;
    }
}
