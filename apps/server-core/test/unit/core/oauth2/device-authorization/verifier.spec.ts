/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { ErrorCode } from '@authup/errors';
import { OAuth2ErrorCode, OAuth2GrantError, OAuth2SubKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type { OAuth2DeviceCodeRequest } from '../../../../../src/core/index.ts';
import { OAuth2DeviceCodeStatus, OAuth2DeviceCodeVerifier } from '../../../../../src/core/index.ts';
import { FakeOAuth2DeviceCodeRepository } from '../../helpers/index.ts';

const CLIENT_ID = randomUUID();
const REALM_ID = randomUUID();
const OPTIONS = { clientId: CLIENT_ID, realmId: REALM_ID };

const buildRequest = (input: Partial<OAuth2DeviceCodeRequest> = {}) : OAuth2DeviceCodeRequest => ({
    id: randomBytes(32).toString('hex'),
    user_code: 'BCDFGHJK',
    client_id: CLIENT_ID,
    realm_id: REALM_ID,
    realm_name: 'master',
    scope: 'global openid',
    expires_at: Math.floor(Date.now() / 1000) + 600,
    ...input,
});

describe('OAuth2DeviceCodeVerifier', () => {
    let repository : FakeOAuth2DeviceCodeRepository;
    let verifier : OAuth2DeviceCodeVerifier;

    beforeEach(() => {
        repository = new FakeOAuth2DeviceCodeRepository();
        verifier = new OAuth2DeviceCodeVerifier({ repository });
    });

    it('should answer authorization_pending while no decision exists', async () => {
        const request = repository.seed(buildRequest());

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({
                code: ErrorCode.OAUTH_AUTHORIZATION_PENDING,
                data: expect.objectContaining({ error: OAuth2ErrorCode.AUTHORIZATION_PENDING }),
            }));

        expect(repository.has(request.id)).toBe(true);
    });

    it('should answer slow_down inside the poll window and pending again once it lapsed', async () => {
        const request = repository.seed(buildRequest());

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_AUTHORIZATION_PENDING }));

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({
                code: ErrorCode.OAUTH_SLOW_DOWN,
                data: expect.objectContaining({ error: OAuth2ErrorCode.SLOW_DOWN }),
            }));

        expect(repository.touchPollCalls).toHaveLength(2);

        repository.dropPoll(request.id);

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_AUTHORIZATION_PENDING }));

        expect(repository.touchPollCalls).toHaveLength(3);
    });

    it('should answer expired_token and remove the blob past expires_at', async () => {
        const request = repository.seed(buildRequest({ expires_at: Math.floor(Date.now() / 1000) - 1 }));

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({
                code: ErrorCode.OAUTH_DEVICE_CODE_EXPIRED,
                data: expect.objectContaining({ error: OAuth2ErrorCode.EXPIRED_TOKEN }),
            }));

        expect(repository.removeByIdCalls).toEqual([request.id]);
        expect(repository.has(request.id)).toBe(false);
        expect(repository.touchPollCalls).toHaveLength(0);
    });

    it('should answer access_denied once for a denied code, then invalid_grant', async () => {
        const request = repository.seed(buildRequest());
        await repository.decide(request.id, { status: OAuth2DeviceCodeStatus.DENIED }, request.expires_at);

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({
                code: ErrorCode.OAUTH_ACCESS_DENIED,
                data: expect.objectContaining({ error: OAuth2ErrorCode.ACCESS_DENIED }),
            }));

        expect(repository.has(request.id)).toBe(false);

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
    });

    it('should return an approved code once, then invalid_grant', async () => {
        const request = repository.seed(buildRequest());
        await repository.decide(request.id, {
            status: OAuth2DeviceCodeStatus.APPROVED,
            sub: randomUUID(),
            sub_kind: OAuth2SubKind.USER,
            session_id: randomUUID(),
            auth_time: Math.floor(Date.now() / 1000),
            auth_method: 'pwd',
        }, request.expires_at);

        const entity = await verifier.verify(request.id, OPTIONS);
        expect(entity.id).toEqual(request.id);
        expect(entity.status).toEqual(OAuth2DeviceCodeStatus.APPROVED);
        expect(entity.decision.status).toEqual(OAuth2DeviceCodeStatus.APPROVED);
        expect(entity.decision.sub_kind).toEqual(OAuth2SubKind.USER);

        expect(repository.popOneByIdCalls).toEqual([request.id]);
        expect(repository.has(request.id)).toBe(false);

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_GRANT_INVALID }));
    });

    it('should answer invalid_grant for an unknown device_code', async () => {
        await expect(verifier.verify(randomBytes(32).toString('hex'), OPTIONS))
            .rejects.toThrow(expect.objectContaining({
                code: ErrorCode.OAUTH_GRANT_INVALID,
                message: OAuth2GrantError.invalid().message,
            }));

        expect(repository.touchPollCalls).toHaveLength(0);
    });

    it('should refuse a foreign client with the unknown-code message and arm nothing', async () => {
        const request = repository.seed(buildRequest());

        await expect(verifier.verify(request.id, { clientId: randomUUID(), realmId: REALM_ID }))
            .rejects.toThrow(expect.objectContaining({
                code: ErrorCode.OAUTH_GRANT_INVALID,
                message: OAuth2GrantError.invalid().message,
            }));

        expect(repository.has(request.id)).toBe(true);
        expect(repository.hasPoll(request.id)).toBe(false);
        expect(repository.touchPollCalls).toHaveLength(0);
        expect(repository.popOneByIdCalls).toHaveLength(0);
        expect(repository.removeByIdCalls).toHaveLength(0);
    });

    it('should refuse a foreign realm with the unknown-code message and arm nothing', async () => {
        const request = repository.seed(buildRequest());

        await expect(verifier.verify(request.id, { clientId: CLIENT_ID, realmId: randomUUID() }))
            .rejects.toThrow(expect.objectContaining({
                code: ErrorCode.OAUTH_GRANT_INVALID,
                message: OAuth2GrantError.invalid().message,
            }));

        expect(repository.has(request.id)).toBe(true);
        expect(repository.hasPoll(request.id)).toBe(false);
        expect(repository.touchPollCalls).toHaveLength(0);

        await expect(verifier.verify(request.id, OPTIONS))
            .rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_AUTHORIZATION_PENDING }));
    });
});
