/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import { OAuth2ErrorCode, OAuth2TokenGrant, isOAuth2ClientUnauthorizedError } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { assertClientGrantAllowed } from '../../../../../src/core/oauth2/client/grant-type.ts';

const buildClient = (grantTypes: string | null) => ({ grant_types: grantTypes });

describe('assertClientGrantAllowed', () => {
    it('should allow every grant when grant_types is null', () => {
        const client = buildClient(null);
        expect(() => assertClientGrantAllowed(client, OAuth2TokenGrant.PASSWORD)).not.toThrow();
        expect(() => assertClientGrantAllowed(client, OAuth2TokenGrant.CLIENT_CREDENTIALS)).not.toThrow();
    });

    it('should allow a listed grant', () => {
        const client = buildClient('authorization_code refresh_token');
        expect(() => assertClientGrantAllowed(client, OAuth2TokenGrant.AUTHORIZATION_CODE)).not.toThrow();
        expect(() => assertClientGrantAllowed(client, OAuth2TokenGrant.REFRESH_TOKEN)).not.toThrow();
    });

    it('should reject an unlisted grant with unauthorized_client', () => {
        const client = buildClient('authorization_code refresh_token');

        expect.assertions(4);
        try {
            assertClientGrantAllowed(client, OAuth2TokenGrant.PASSWORD);
        } catch (e) {
            expect(isOAuth2ClientUnauthorizedError(e)).toBe(true);
            if (isOAuth2ClientUnauthorizedError(e)) {
                expect(e.code).toBe(ErrorCode.OAUTH_CLIENT_UNAUTHORIZED);
                expect(e.data?.error).toBe(OAuth2ErrorCode.UNAUTHORIZED_CLIENT);
                expect(e.message).toContain(OAuth2TokenGrant.PASSWORD);
            }
        }
    });

    it('should treat unknown values in the list as inert', () => {
        const client = buildClient('foo bar');
        expect(() => assertClientGrantAllowed(client, OAuth2TokenGrant.PASSWORD))
            .toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_CLIENT_UNAUTHORIZED }));
    });

    it('should accept comma-delimited lists', () => {
        const client = buildClient('authorization_code,refresh_token');
        expect(() => assertClientGrantAllowed(client, OAuth2TokenGrant.REFRESH_TOKEN)).not.toThrow();
        expect(() => assertClientGrantAllowed(client, OAuth2TokenGrant.PASSWORD))
            .toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_CLIENT_UNAUTHORIZED }));
    });
});
