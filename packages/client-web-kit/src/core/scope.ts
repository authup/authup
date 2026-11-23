/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App, EffectScope } from 'vue';
import { effectScope } from 'vue';

const scopes = new WeakMap<App, EffectScope>();

function useAppScope(app: App) : EffectScope {
    let scope = scopes.get(app);

    if (!scope) {
        // Detached: the code calling this runs outside any component, so
        // there is no parent scope to collect it, and the app owns it.
        scope = effectScope(true);
        scopes.set(app, scope);

        app.onUnmount(() => {
            scope?.stop();
            scopes.delete(app);
        });
    }

    return scope;
}

/**
 * Run `fn` with the app's injection context AND an effect scope the app
 * owns, stopped when the app unmounts.
 *
 * `app.runWithContext()` alone gives `inject()` but no effect scope, so a
 * composable registering `onScopeDispose` (`useTranslation`) warns and its
 * subscriptions are never stopped. Boot code building app-level options
 * (`buildVuecsInstallOptions()`, a translated component default) runs here.
 */
export function runInAppScope<T>(app: App, fn: () => T) : T {
    const scope = useAppScope(app);

    return app.runWithContext(() => scope.run(fn) as T);
}
