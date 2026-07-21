/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IPermissionEvaluator,
    PermissionCompileContext,
    PermissionCompileResult,
    PermissionEvaluationContext,
} from '@authup/access';
import { PermissionError } from '@authup/access';

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

    public compileCalls: PermissionCompileContext[] = [];

    private compileResult: PermissionCompileResult = { verdict: 'post' };

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

    /**
     * Defaults to `post` — services then take their per-row evaluation path, so
     * existing service tests keep asserting the `evaluate` calls they set up.
     * Override per test via {@link setCompileResult}.
     */
    async compile(ctx: PermissionCompileContext): Promise<PermissionCompileResult> {
        this.compileCalls.push(ctx);
        return this.compileResult;
    }

    setCompileResult(result: PermissionCompileResult) {
        this.compileResult = result;
    }

    setBehavior(behavior: EvaluatorBehavior) {
        this.behavior = behavior;
    }

    denyAll(error: Error = PermissionError.denied('test')) {
        this.behavior = () => { throw error; };
    }

    deny(method: EvaluatorMethodName, error: Error = PermissionError.denied('test')) {
        const previous = this.behavior;
        this.behavior = (call) => {
            if (call.method === method) {
                throw error;
            }
            return previous(call);
        };
    }
}
