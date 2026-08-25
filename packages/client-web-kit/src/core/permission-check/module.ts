/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData, PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import type { Ref } from 'vue';
import {
    onMounted,
    onUnmounted,
    ref,
    watch,
} from 'vue';
import { useHydratedValue } from '../hydration';
import type { Store } from '../store';
import { injectStore, storeToRefs } from '../store';
import type {
    PermissionCheckerReactiveFn,
    PermissionCheckerReactiveFnContext,
    PermissionCheckerReactiveFnCreateContext,
} from './types';

/**
 * Identity of a permission question, or undefined when it cannot be keyed.
 *
 * The actor is part of the key. A verdict is only ever a seed for the first
 * render, and keying it to the identity that produced it keeps an account
 * switch from adopting the previous actor's answer. A `PolicyData` bag is
 * per-call resource state rather than a stable identity, so those checks opt
 * out and keep evaluating from their fail-closed default.
 */
function buildPermissionHydrationKey(
    ctx: PermissionEvaluationContext,
    identity: { userId?: string | null, realmId?: string | null },
) : string | undefined {
    if (ctx.data) {
        return undefined;
    }

    const name = Array.isArray(ctx.name) ?
        [...ctx.name].sort().join(',') :
        ctx.name;

    return [
        'authup:permission',
        identity.userId || '',
        identity.realmId || '',
        name,
        ctx.realmId || '',
        ctx.clientId || '',
    ].join(':');
}

export function createPermissionCheckerReactiveFn(
    ctx: PermissionCheckerReactiveFnCreateContext = {},
) : PermissionCheckerReactiveFn {
    let store : Store;
    if (ctx.store) {
        store = ctx.store;
    } else {
        store = injectStore(ctx.pinia, ctx.app);
    }

    const storeRefs = storeToRefs(store);

    // The returned fn registers lifecycle hooks — call it ONCE during setup.
    // Pass a GETTER to make the evaluation context reactive: the checker
    // re-evaluates whenever the getter's dependencies (e.g. component props)
    // change, in addition to the login-state changes it always tracks.
    return (ctx: PermissionCheckerReactiveFnContext) : Ref<boolean> => {
        const resolveContext : () => PermissionEvaluationContext = typeof ctx === 'function' ?
            ctx :
            () => ctx;

        const data = ref(false);

        // guards a recompute triggered while an earlier evaluation is still
        // in flight — only the latest evaluation may write the outcome (the
        // stale one ran against a superseded context or login state).
        let sequence = 0;

        const compute = async () => {
            let identity: IdentityPolicyData | undefined;
            if (storeRefs.userId.value) {
                identity = {
                    type: 'user',
                    id: storeRefs.userId.value,
                };

                if (storeRefs.realmId.value) {
                    identity.realmId = storeRefs.realmId.value;
                }

                if (storeRefs.realmName.value) {
                    identity.realmName = storeRefs.realmName.value;
                }
            }

            const evaluationContext = resolveContext();

            const input = evaluationContext.data || new PolicyData();
            input.set(BuiltInPolicyType.IDENTITY, identity);

            try {
                return await store.permissionEvaluator
                    .preEvaluateOneOf({
                        ...evaluationContext,
                        data: input,
                    })
                    .then(() => true)
                    .catch(() => false);
            } catch {
                return false;
            }
        };

        const recompute = () => {
            sequence++;
            const current = sequence;

            // fail closed while the replacement evaluation is pending — a
            // previously allowed outcome must not keep authorizing across a
            // context/login change.
            data.value = false;

            return Promise.resolve()
                .then(() => compute())
                .then((outcome) => {
                    if (current === sequence) {
                        data.value = outcome;
                    }

                    return outcome;
                });
        };

        const pending = recompute();

        // The evaluation is async, so a server-rendered subtree shows the
        // verdict while the hydrating client is still at its fail-closed
        // default: a mismatch on everything gated by a permission. Seed the
        // first client render with what the render decided; `recompute` above
        // is already in flight and stays authoritative.
        const hydrationKey = buildPermissionHydrationKey(resolveContext(), {
            userId: storeRefs.userId.value,
            realmId: storeRefs.realmId.value,
        });
        if (hydrationKey) {
            useHydratedValue<boolean>({
                key: hydrationKey,
                resolve: () => pending,
                apply: (value) => {
                    data.value = value;
                },
            });
        }

        let removeListener: undefined | CallableFunction;
        onMounted(() => {
            // `status`, not the token-derived `loggedIn`: a cookie session
            // (plan 088) never holds an access token, so that flag never flips
            // and the verdict would latch at its fail-closed default. Both
            // flip in the same synchronous commit as the permissions, so bearer
            // mode re-evaluates at the same instant it did before.
            removeListener = watch(
                [storeRefs.status, resolveContext],
                () => recompute(),
            );
        });

        onUnmounted(() => {
            if (typeof removeListener !== 'undefined') {
                removeListener();
            }
        });

        return data;
    };
}
