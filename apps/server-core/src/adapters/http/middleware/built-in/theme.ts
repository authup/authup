/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App, IAppEvent } from 'routup';
import { defineCoreHandler } from 'routup';
import type { IThemeProvider } from '../../ui/theme/index.ts';

/**
 * Per-request handoff of the operator theme into the two console serve
 * paths, the same mechanism as UI_HTTP_CLIENT_FACTORY_STORE_KEY.
 *
 * A store handoff rather than module-scope state, so two applications in
 * one process (the test suite) never share a theme, and rather than
 * threading the provider through seven workflow controllers, which is a
 * lot of plumbing for decoration.
 */
export const THEME_STORE_KEY = Symbol('Theme');

export function registerThemeMiddleware(router: App, provider: IThemeProvider) {
    router.use(defineCoreHandler((event) => {
        event.store[THEME_STORE_KEY] = provider;

        return event.next();
    }));
}

export function useRequestTheme(event: IAppEvent) : IThemeProvider | undefined {
    return event.store[THEME_STORE_KEY] as IThemeProvider | undefined;
}
