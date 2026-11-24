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
    PermissionPolicyBinding,
} from '@authup/access';
import { PermissionError } from '@authup/access';
import type { INarrowablePermissionEvaluator } from '@authup/server-kit';

export type EvaluatorMethodName = 'evaluate' | 'evaluateOneOf' | 'preEvaluate' | 'preEvaluateOneOf';

export type EvaluatorCall = {
    method: EvaluatorMethodName;
    ctx: PermissionEvaluationContext;
};

export type EvaluatorBehavior = (call: EvaluatorCall) => void | Promise<void>;

export type EvaluatorNarrowing = (grants: PermissionPolicyBinding[]) => IPermissionEvaluator;

export class FakePermissionEvaluator implements INarrowablePermissionEvaluator {
    public evaluateCalls: PermissionEvaluationContext[] = [];

    public evaluateOneOfCalls: PermissionEvaluationContext[] = [];

    public preEvaluateCalls: PermissionEvaluationContext[] = [];

    public preEvaluateOneOfCalls: PermissionEvaluationContext[] = [];

    public compileCalls: PermissionCompileContext[] = [];

    private compileResult: PermissionCompileResult = { verdict: 'post' };

    private behavior: EvaluatorBehavior;

    private narrowing: EvaluatorNarrowing = () => {
        const narrowed = new FakePermissionEvaluator();

        narrowed.denyAll();

        return narrowed;
    };

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

    /**
     * Defaults to an evaluator denying everything: the fake knows no grants,
     * so none of them passes a gate on its own. Override per test via
     * {@link setNarrowing}.
     */
    narrowGrants(grants: PermissionPolicyBinding[]): IPermissionEvaluator {
        return this.narrowing(grants);
    }

    setNarrowing(narrowing: EvaluatorNarrowing) {
        this.narrowing = narrowing;
    }

    setCompileResult(result: PermissionCompileResult) {
        this.compileResult = result;
    }

    setBehavior(behavior: EvaluatorBehavior) {
        this.behavior = behavior;
    }

    denyAll(error: Error = PermissionError.denied('test')) {
        this.behavior = () => {
            throw error;
        };
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
