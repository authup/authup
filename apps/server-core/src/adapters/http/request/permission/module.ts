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
    PolicyWithType,
    ResolveJunctionPolicyOptions,
} from '@authup/access';
import {
    BuiltInPolicyType, PolicyData, mergePermissionBindings,
} from '@authup/access';
import type { Request } from 'routup';
import type { IIdentityPermissionProvider } from '../../../../core/index.ts';
import { useRequestIdentity, useRequestScopes } from '../helpers/index.ts';

export type RequestAccessContextOptions = {
    evaluator: IPermissionEvaluator;
    identityPermissionProvider?: IIdentityPermissionProvider;
};

export class RequestAccessContext implements IPermissionEvaluator {
    protected req: Request;

    protected evaluator: IPermissionEvaluator;

    protected identityPermissionProvider?: IIdentityPermissionProvider;

    constructor(req: Request, options: RequestAccessContextOptions) {
        this.req = req;
        this.evaluator = options.evaluator;
        this.identityPermissionProvider = options.identityPermissionProvider;
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

    async resolveJunctionPolicy(options: ResolveJunctionPolicyOptions): Promise<PolicyWithType | undefined> {
        const identity = useRequestIdentity(this.req);
        if (!this.identityPermissionProvider || !identity) {
            return undefined;
        }

        const bindings = await this.identityPermissionProvider.getFor(identity);
        const matching = bindings.filter((b) => {
            if (b.permission.name !== options.name) {
                return false;
            }

            if (typeof options.realm_id !== 'undefined') {
                if ((b.permission.realm_id ?? null) !== (options.realm_id ?? null)) {
                    return false;
                }
            }

            if (typeof options.client_id !== 'undefined') {
                if ((b.permission.client_id ?? null) !== (options.client_id ?? null)) {
                    return false;
                }
            }

            return true;
        });

        if (matching.length === 0) {
            return undefined;
        }

        const merged = mergePermissionBindings(matching);

        if (merged.length > 0 && merged[0].policies && merged[0].policies.length > 0) {
            return merged[0].policies[0];
        }

        return undefined;
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
