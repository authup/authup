/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { Client } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { TokenVerifier } from '@authup/server-adapter-kit';
import { JWTError, OAuth2TokenKind } from '@authup/specs';
import {
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { verifyRequest } from '../../src';
import { Signer } from '../utils/signer';

const sub = 'a1f4c2e3-6b7d-4e8f-9a0b-1c2d3e4f5a6b';
const realm_id = 'b2a5d3f4-7c8e-4f9a-8b1c-2d3e4f5a6b7c';

const req = (token: string) => new Request('http://localhost/', { headers: { authorization: `Bearer ${token}` } });

describe('verifyRequest with a TokenVerifier', () => {
    let signer : Signer;
    let getJwk : ReturnType<typeof vi.spyOn>;
    let payload : Record<string, any>;
    let valid : string;
    let expired : string;
    let tokenVerifier : TokenVerifier;

    beforeAll(async () => {
        signer = new Signer();
        getJwk = vi.spyOn(Client.prototype, 'getJwk').mockImplementation(() => signer.useJwk());

        const now = Math.floor(Date.now() / 1000);

        payload = {
            kind: OAuth2TokenKind.ACCESS,
            sub,
            sub_kind: 'user',
            realm_id,
            realm_name: 'master',
            permissions: [],
            iat: now,
            exp: now + 3600,
        };

        valid = await signer.sign(payload);
        expired = await signer.sign({
            ...payload,
            iat: now - 7200,
            exp: now - 3600,
        });

        tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });
    });

    it('resolves the token data for a valid token', async () => {
        const data = await verifyRequest(req(valid), { tokenVerifier });

        expect(data).toMatchObject({
            sub,
            realm_id,
            permissions: [],
        });
    });

    it('rejects an expired token as expired', async () => {
        await expect(verifyRequest(req(expired), { tokenVerifier }))
            .rejects.toMatchObject({ code: ErrorCode.JWT_EXPIRED });
    });

    it('rejects a token signed by another key', async () => {
        await expect(verifyRequest(req(await new Signer().sign(payload)), { tokenVerifier }))
            .rejects.toBeInstanceOf(JWTError);
    });

    it('rejects a malformed token', async () => {
        await expect(verifyRequest(req('not-a-jwt'), { tokenVerifier }))
            .rejects.toBeInstanceOf(JWTError);
    });

    it('fetches the signing key once across requests', async () => {
        getJwk.mockClear();

        const verifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

        await verifyRequest(req(valid), { tokenVerifier: verifier });
        await verifyRequest(req(await signer.sign({ ...payload, jti: randomUUID() })), { tokenVerifier: verifier });

        expect(getJwk).toHaveBeenCalledTimes(1);
    });
});
