/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import { describe, expect, it } from 'vitest';
import {
    OAuth2DeviceAuthorizationError,
    OAuth2ErrorCode,
    OAuth2GrantError,
    isOAuth2DeviceAuthorizationError,
    isOAuth2Error,
    isOAuth2GrantError,
} from '../../../src';

const roundtrip = (input: unknown) => JSON.parse(JSON.stringify(input));

describe('src/oauth2/check', () => {
    describe('isOAuth2DeviceAuthorizationError', () => {
        it.each([
            ['pending', OAuth2DeviceAuthorizationError.pending(), ErrorCode.OAUTH_AUTHORIZATION_PENDING, OAuth2ErrorCode.AUTHORIZATION_PENDING],
            ['slowDown', OAuth2DeviceAuthorizationError.slowDown(), ErrorCode.OAUTH_SLOW_DOWN, OAuth2ErrorCode.SLOW_DOWN],
            ['expired', OAuth2DeviceAuthorizationError.expired(), ErrorCode.OAUTH_DEVICE_CODE_EXPIRED, OAuth2ErrorCode.EXPIRED_TOKEN],
        ])('should match the %s instance and carry its code pair', (_name, error, code, wire) => {
            expect(isOAuth2DeviceAuthorizationError(error)).toBe(true);
            expect(isOAuth2Error(error)).toBe(true);
            expect(error.code).toEqual(code);
            expect(error.data?.error).toEqual(wire);
        });

        it('should match the JSON round-trip of every variant', () => {
            expect(isOAuth2DeviceAuthorizationError(roundtrip(OAuth2DeviceAuthorizationError.pending()))).toBe(true);
            expect(isOAuth2DeviceAuthorizationError(roundtrip(OAuth2DeviceAuthorizationError.slowDown()))).toBe(true);
            expect(isOAuth2DeviceAuthorizationError(roundtrip(OAuth2DeviceAuthorizationError.expired()))).toBe(true);
        });

        it('should reject a grant error, and the grant guard rejects it back', () => {
            expect(isOAuth2DeviceAuthorizationError(OAuth2GrantError.invalid())).toBe(false);
            expect(isOAuth2DeviceAuthorizationError(roundtrip(OAuth2GrantError.invalid()))).toBe(false);
            expect(isOAuth2GrantError(OAuth2DeviceAuthorizationError.pending())).toBe(false);
        });

        it('should carry no interval on slow_down', () => {
            expect(OAuth2DeviceAuthorizationError.slowDown().data).not.toHaveProperty('interval');
        });
    });
});
