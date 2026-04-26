/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator, PermissionEvaluationContext } from '@authup/access';
import { ForbiddenError } from '@ebec/http';

export type EvaluatorMethodName = 'evaluate' | 'evaluateOneOf' | 'preEvaluate' | 'preEvaluateOneOf';

export type EvaluatorCall = {
    method: EvaluatorMethodName;
    ctx: PermissionEvaluationContext;
};

export type EvaluatorBehavior = (call: EvaluatorCall) => void | Promise<void>;

export class FakePermissionEvaluator implements IPermissionEvaluator {
    public evaluateCalls: PermissionEvaluationContext[] = [];

    public evaluateOneOfCalls: PermissionEvaluationContext[] = [];

    public preEvaluateCalls: PermissionEvaluationContext[] = [];

    public preEvaluateOneOfCalls: PermissionEvaluationContext[] = [];

    private behavior: EvaluatorBehavior;

    constructor(behavior: EvaluatorBehavior = () => {}) {
        this.behavior = behavior;
    }

    async evaluate(ctx: PermissionEvaluationContext): Promise<void> {
        this.evaluateCalls.push(ctx);
        await this.behavior({ method: 'evaluate', ctx });
    }

    async evaluateOneOf(ctx: PermissionEvaluationContext): Promise<void> {
        this.evaluateOneOfCalls.push(ctx);
        await this.behavior({ method: 'evaluateOneOf', ctx });
    }

    async preEvaluate(ctx: PermissionEvaluationContext): Promise<void> {
        this.preEvaluateCalls.push(ctx);
        await this.behavior({ method: 'preEvaluate', ctx });
    }

    async preEvaluateOneOf(ctx: PermissionEvaluationContext): Promise<void> {
        this.preEvaluateOneOfCalls.push(ctx);
        await this.behavior({ method: 'preEvaluateOneOf', ctx });
    }

    setBehavior(behavior: EvaluatorBehavior) {
        this.behavior = behavior;
    }

    denyAll(error: Error = new ForbiddenError()) {
        this.behavior = () => { throw error; };
    }

    deny(method: EvaluatorMethodName, error: Error = new ForbiddenError()) {
        const previous = this.behavior;
        this.behavior = (call) => {
            if (call.method === method) {
                throw error;
            }
            return previous(call);
        };
    }
}
