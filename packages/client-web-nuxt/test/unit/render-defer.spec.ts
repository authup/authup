/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import { describe, expect, it } from 'vitest';
import { RENDER_DEFER_SKEW_MS, shouldDeferRender } from '../../src/runtime/helpers/render-defer';

const NOW = Date.parse('2026-11-25T12:00:00.000Z');

function reader(cookies: Record<string, string>) {
    return (name: string) => cookies[name];
}

describe('shouldDeferRender', () => {
    it('should render without any session cookie', () => {
        expect(shouldDeferRender(reader({}), NOW)).toBe(false);
    });

    it('should defer when only the refresh token is left', () => {
        expect(shouldDeferRender(reader({ [CookieName.REFRESH_TOKEN]: 'rt-1' }), NOW)).toBe(true);
    });

    it('should render while the access token stays valid', () => {
        expect(shouldDeferRender(reader({
            [CookieName.REFRESH_TOKEN]: 'rt-1',
            [CookieName.ACCESS_TOKEN]: 'at-1',
            [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: new Date(NOW + 3600 * 1000).toISOString(),
        }), NOW)).toBe(false);
    });

    it('should defer when the access token expires within the skew', () => {
        expect(shouldDeferRender(reader({
            [CookieName.REFRESH_TOKEN]: 'rt-1',
            [CookieName.ACCESS_TOKEN]: 'at-1',
            [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: new Date(NOW + RENDER_DEFER_SKEW_MS - 1).toISOString(),
        }), NOW)).toBe(true);
    });

    it('should read the expire date in the JSON-quoted form nuxt writes', () => {
        const expired = JSON.stringify(new Date(NOW - 1000).toISOString());

        expect(shouldDeferRender(reader({
            [CookieName.REFRESH_TOKEN]: 'rt-1',
            [CookieName.ACCESS_TOKEN]: 'at-1',
            [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: expired,
        }), NOW)).toBe(true);
    });

    it('should render when the expire date cannot be read', () => {
        expect(shouldDeferRender(reader({
            [CookieName.REFRESH_TOKEN]: 'rt-1',
            [CookieName.ACCESS_TOKEN]: 'at-1',
            [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: 'not-a-date',
        }), NOW)).toBe(false);
    });

    it('should render an access token without a refresh token', () => {
        expect(shouldDeferRender(reader({ [CookieName.ACCESS_TOKEN]: 'at-1' }), NOW)).toBe(false);
    });
});
