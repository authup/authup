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
import { PermissionEvaluator, PermissionMemoryProvider, PolicyEngine } from '@authup/access';
import type { OAuth2TokenPermission } from '@authup/specs';

/**
 * The store's one permission evaluator for its whole lifetime. Consumers hold
 * on to `store.permissionEvaluator`, so a session commit swaps what it
 * DELEGATES to rather than the object itself: the evaluator built from the
 * catalog and the introspection's grants, or the name-only fallback for a
 * server predating `GET /authorization`. A reset denies everything.
 */
export class StorePermissionEvaluator implements IPermissionEvaluator {
    protected inner : IPermissionEvaluator;

    constructor() {
        this.inner = buildFallback([]);
    }

    setEvaluator(evaluator: IPermissionEvaluator) : void {
        this.inner = evaluator;
    }

    setPermissions(permissions: OAuth2TokenPermission[]) : void {
        this.inner = buildFallback(permissions);
    }

    reset() : void {
        this.inner = buildFallback([]);
    }

    evaluate(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.inner.evaluate(ctx);
    }

    evaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.inner.evaluateOneOf(ctx);
    }

    preEvaluate(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.inner.preEvaluate(ctx);
    }

    preEvaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.inner.preEvaluateOneOf(ctx);
    }

    compile(ctx: PermissionCompileContext) : Promise<PermissionCompileResult> {
        return this.inner.compile(ctx);
    }
}

function buildFallback(permissions: OAuth2TokenPermission[]) : IPermissionEvaluator {
    return new PermissionEvaluator({
        provider: new PermissionMemoryProvider(permissions.map((permission) => ({
            permission: {
                name: permission.name,
                realmId: permission.realm_id,
                clientId: permission.client_id,
            },
        }))),
        policyEngine: new PolicyEngine(),
    });
}
