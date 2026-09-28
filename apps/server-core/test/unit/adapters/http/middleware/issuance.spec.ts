/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isOAuth2IssuancePath } from '../../../../../src/adapters/http/middleware/built-in/authorization/issuance.ts';

describe('isOAuth2IssuancePath', () => {
    it.each([
        '/token',
        '/realms/master/token',
        '/realms/master/token/introspect',
        '/REALMS/x/TOKEN/',
    ])('should treat %s as an issuance path', (path) => {
        expect(isOAuth2IssuancePath(path)).toBe(true);
    });

    it.each([
        '/realms/master/users',
        '/realms/token',
    ])('should not treat %s as an issuance path', (path) => {
        expect(isOAuth2IssuancePath(path)).toBe(false);
    });
});
