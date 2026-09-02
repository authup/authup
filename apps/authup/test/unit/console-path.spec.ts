/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { assertConsolePath } from '../../src/console/path';

const PUBLIC_URL = 'https://idp.example.com';
const PUBLIC_URL_SUB_PATH = 'https://example.com/auth';

describe('assertConsolePath', () => {
    it('should mount a console at its own path when the deployment owns the origin root', () => {
        expect(assertConsolePath('admin', `${PUBLIC_URL}/console/admin`, PUBLIC_URL))
            .toEqual('/console/admin');
    });

    /**
     * The regression behind #3531: under a sub-path deployment the proxy
     * strips publicUrl's prefix before the request reaches the listener, the
     * way it does for every server-core route, so the mount must not carry it.
     * Mounting the browser-facing path answered 404 for every console page.
     */
    it('should subtract the deployment path prefix, because the listener never sees it', () => {
        expect(assertConsolePath('admin', `${PUBLIC_URL_SUB_PATH}/console/admin`, PUBLIC_URL_SUB_PATH))
            .toEqual('/console/admin');
    });

    it('should subtract the prefix from a console published under a path of its own', () => {
        expect(assertConsolePath('auth', `${PUBLIC_URL_SUB_PATH}/login`, PUBLIC_URL_SUB_PATH))
            .toEqual('/login');
    });

    it('should refuse a console url outside the deployment path prefix', () => {
        expect(() => assertConsolePath('admin', 'https://example.com/elsewhere', PUBLIC_URL_SUB_PATH))
            .toThrow(/outside/);
    });

    it('should refuse a console url that is the deployment root', () => {
        expect(() => assertConsolePath('admin', PUBLIC_URL, PUBLIC_URL))
            .toThrow(/deployment's own root/);
    });

    it('should refuse a console url that is the deployment prefix itself', () => {
        expect(() => assertConsolePath('admin', PUBLIC_URL_SUB_PATH, PUBLIC_URL_SUB_PATH))
            .toThrow(/deployment's own root/);
    });
});
