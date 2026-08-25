/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { inject, provide } from 'vue';
import type { AdminConsoleConfig } from './config';

const sym = Symbol.for('AdminConsoleConfig');

export function provideAdminConsoleConfig(config: AdminConsoleConfig, app?: App) {
    if (app) {
        app.provide(sym, config);
        return;
    }

    provide(sym, config);
}

export function injectAdminConsoleConfig() : AdminConsoleConfig {
    const config = inject<AdminConsoleConfig>(sym);
    if (!config) {
        throw new Error('The admin console config has not been provided.');
    }

    return config;
}
