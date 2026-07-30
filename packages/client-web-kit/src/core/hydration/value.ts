/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCurrentInstance, onServerPrefetch } from 'vue';
import { injectHydrationStore } from './singleton';
import type { HydratedValueContext } from './types';

export function isServerRuntime() : boolean {
    return typeof window === 'undefined';
}

/**
 * Carry an asynchronously resolved value across the SSR boundary.
 *
 * A value the server resolved before rendering (a translation, a permission
 * verdict) is only available in the browser one microtask after hydration,
 * so the first client render would emit a placeholder where the markup
 * already holds the real thing. The server render resolves and records it,
 * the hydrating client applies it up front, and both first renders agree.
 *
 * Entries are deliberately NOT consumed on read: unlike a collection's rows,
 * the same key is shared by every component asking the same question, and the
 * answer does not go stale within the app instance (the locale is part of the
 * translation key). Values only ever seed the first render. Whatever the
 * component does afterwards stays in charge.
 */
export function useHydratedValue<T>(ctx: HydratedValueContext<T>) : void {
    const store = injectHydrationStore();
    if (!store) {
        return;
    }

    if (isServerRuntime()) {
        // no component instance means no render to precede, so nothing to hand over
        if (!getCurrentInstance()) {
            return;
        }

        onServerPrefetch(async () => {
            // The handoff is an optimization, so a failed lookup degrades to
            // the non-hydrated path (the client resolves for itself) instead
            // of rejecting. An unhandled rejection here would reach the
            // renderer, and Node terminates the process over it.
            try {
                const value = await ctx.resolve();
                if (typeof value === 'undefined') {
                    return;
                }

                ctx.apply(value);
                store.set(ctx.key, value);
            } catch {
                // nothing to hand over
            }
        });

        return;
    }

    const value = store.get<T>(ctx.key);
    if (typeof value !== 'undefined') {
        ctx.apply(value);
    }
}
