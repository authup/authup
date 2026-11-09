/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNoopLogger } from '@authup/server-kit';
import {
    JWKType,
    OAuth2ErrorCode,
    OAuth2TokenKind,
    isOAuth2Error,
} from '@authup/specs';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { OAuth2CapabilityTokenIssuer } from '../../../../../../../src/core/oauth2/token/issuer/capability/index.ts';
import { FakeOAuth2TokenSigner } from '../../../../helpers/index.ts';

const REALM_ID = '11111111-1111-4111-8111-111111111111';

describe('OAuth2CapabilityTokenIssuer', () => {
    it('signs a capability token whose claims the caller decided', async () => {
        const signer = new FakeOAuth2TokenSigner('capability-token');
        const issuer = new OAuth2CapabilityTokenIssuer(signer, { issuer: 'https://auth.example.com/' });

        const [token, payload] = await issuer.issue({
            sub: 'subject',
            realm_id: REALM_ID,
            realm_name: 'sub-realm',
            exp: 1234,
            cap: ['bucket:a:read'],
        });

        expect(token).toEqual('capability-token');
        expect(signer.signCalls).toHaveLength(1);

        expect(payload.kind).toEqual(OAuth2TokenKind.CAPABILITY);
        expect(payload.jti).toBeDefined();
        expect(payload.exp).toEqual(1234);
        expect(payload.iss).toEqual('https://auth.example.com/realms/sub-realm');
    });

    it('generates a new jti for every token', async () => {
        const issuer = new OAuth2CapabilityTokenIssuer(new FakeOAuth2TokenSigner('token', { type: JWKType.EC }));

        const [, first] = await issuer.issue({ realm_id: REALM_ID, exp: 1 });
        const [, second] = await issuer.issue({ realm_id: REALM_ID, exp: 1 });

        expect(first.jti).not.toEqual(second.jti);
    });

    it('signs nothing and answers server_error when the realm key is symmetric', async () => {
        const signer = new FakeOAuth2TokenSigner('token', { type: JWKType.OCT });
        const logger = createNoopLogger();
        const error = vi.spyOn(logger, 'error');

        const issuer = new OAuth2CapabilityTokenIssuer(signer, {}, logger);

        let caught : unknown;

        try {
            await issuer.issue({
                realm_id: REALM_ID,
                realm_name: 'sub-realm',
                exp: 1,
            });
        } catch (e) {
            caught = e;
        }

        expect(isOAuth2Error(caught)).toBe(true);
        expect((caught as { data: { error: string } }).data.error).toEqual(OAuth2ErrorCode.SERVER_ERROR);
        expect(signer.signCalls).toHaveLength(0);
        expect(error).toHaveBeenCalledWith('token exchange requires an asymmetric signing key in realm sub-realm');
    });

    it('refuses a payload without a realm', async () => {
        const signer = new FakeOAuth2TokenSigner();
        const issuer = new OAuth2CapabilityTokenIssuer(signer);

        await expect(issuer.issue({ exp: 1 })).rejects.toBeDefined();
        expect(signer.signCalls).toHaveLength(0);
    });
});
