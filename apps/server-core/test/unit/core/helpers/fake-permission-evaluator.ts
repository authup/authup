/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator, PermissionEvaluationContext } from '@authup/access';
import { ForbiddenError } from '@ebec/http';
import { vi } from 'vitest';

export type EvaluatorMethodName = 'evaluate' | 'evaluateOneOf' | 'preEvaluate' | 'preEvaluateOneOf';

export type EvaluatorCall = {
    method: EvaluatorMethodName;
    ctx: PermissionEvaluationContext;
};

export type EvaluatorBehavior = (call: EvaluatorCall) => void | Promise<void>;

export class FakePermissionEvaluator implements IPermissionEvaluator {
    private behavior: EvaluatorBehavior;

    public readonly evaluate = vi.fn(
        (ctx: PermissionEvaluationContext) => this.run('evaluate', ctx),
    );

    public readonly evaluateOneOf = vi.fn(
        (ctx: PermissionEvaluationContext) => this.run('evaluateOneOf', ctx),
    );

    public readonly preEvaluate = vi.fn(
        (ctx: PermissionEvaluationContext) => this.run('preEvaluate', ctx),
    );

    public readonly preEvaluateOneOf = vi.fn(
        (ctx: PermissionEvaluationContext) => this.run('preEvaluateOneOf', ctx),
    );

    constructor(behavior: EvaluatorBehavior = () => {}) {
        this.behavior = behavior;
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

    private async run(method: EvaluatorMethodName, ctx: PermissionEvaluationContext): Promise<void> {
        await this.behavior({ method, ctx });
    }
}
