/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApp, h } from 'vue';
import { describe, expect, it } from 'vitest';
import { useAccountConsoleURL } from '../../src/composables/account-console';
import { resolveAdminConsoleConfig } from '../../src/config';
import { provideAdminConsoleConfig } from '../../src/di';

describe('useAccountConsoleURL', () => {
    it('uses the relocated account console and encodes the admin return reference', () => {
        const config = resolveAdminConsoleConfig({
            accountConsoleUrl: 'https://account.example.net/account/',
            basePath: '/relocated/admin/',
        }, { origin: window.location.origin });
        let accountURL = '';
        const app = createApp({
            setup() {
                accountURL = useAccountConsoleURL('connected-accounts');

                return () => h('div');
            },
        });
        provideAdminConsoleConfig(config, app);

        app.mount(document.createElement('div'));

        try {
            const returnReference = `${window.location.origin}/relocated/admin`;

            expect(accountURL).toEqual(
                `https://account.example.net/account/connected-accounts?ref=${encodeURIComponent(returnReference)}`,
            );
            expect(new URL(accountURL).searchParams.get('ref')).toEqual(returnReference);
        } finally {
            app.unmount();
        }
    });
});
