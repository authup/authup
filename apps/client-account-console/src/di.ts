/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { inject, provide } from 'vue';
import type { AccountConsoleConfig } from './config';

const sym = Symbol.for('AccountConsoleConfig');

export function provideAccountConsoleConfig(config: AccountConsoleConfig, app?: App) {
    if (app) {
        app.provide(sym, config);
        return;
    }

    provide(sym, config);
}

export function injectAccountConsoleConfig() : AccountConsoleConfig {
    const config = inject<AccountConsoleConfig>(sym);
    if (!config) {
        throw new Error('The account console config has not been provided.');
    }

    return config;
}
