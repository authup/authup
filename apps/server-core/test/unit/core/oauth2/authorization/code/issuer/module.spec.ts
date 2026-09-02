/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2AuthorizationCode, UserIdentity } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2AuthorizationResponseType, OAuth2SubKind } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { OAuth2AuthorizationCodeIssuer } from '../../../../../../../src/core/oauth2/authorization/code/issuer/module.ts';
import type {
    IOAuth2AuthorizationCodeRepository,
    OAuth2AuthorizationCodeInput,
} from '../../../../../../../src/core/oauth2/authorization/code/repository/types.ts';

class FakeAuthorizationCodeRepository implements IOAuth2AuthorizationCodeRepository {
    public saveCalls: OAuth2AuthorizationCodeInput[] = [];

    async removeById(): Promise<void> { /* noop */ }

    async remove(): Promise<void> { /* noop */ }

    async findOneById(): Promise<OAuth2AuthorizationCode | null> {
        return null;
    }

    async popOneById(): Promise<OAuth2AuthorizationCode | null> {
        return null;
    }

    async save(input: OAuth2AuthorizationCodeInput): Promise<OAuth2AuthorizationCode> {
        this.saveCalls.push(input);
        return { ...input, id: input.id ?? randomUUID() };
    }
}

describe('OAuth2AuthorizationCodeIssuer', () => {
    const realmId = randomUUID();

    const buildIdentity = (): UserIdentity => ({
        type: OAuth2SubKind.USER,
        data: {
            id: randomUUID(),
            name: 'user',
            nameLocked: false,
            firstName: null,
            lastName: null,
            displayName: null,
            email: 'user@example.com',
            emailVerified: false,
            password: null,
            avatar: null,
            cover: null,
            resetHash: null,
            resetAt: null,
            resetExpires: null,
            status: null,
            statusMessage: null,
            active: true,
            activateHash: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            realmId,
            realm: {
                id: realmId,
                name: 'master',
                displayName: null,
                description: null,
                builtIn: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        },
    });

    const request = {
        response_type: OAuth2AuthorizationResponseType.CODE,
        client_id: randomUUID(),
        redirect_uri: 'https://example.com/callback',
    };

    it('should stamp the identity realm onto the code', async () => {
        const repository = new FakeAuthorizationCodeRepository();
        const issuer = new OAuth2AuthorizationCodeIssuer(repository);

        const entity = await issuer.issue(request, buildIdentity());

        expect(entity.realm_id).toEqual(realmId);
        expect(entity.realm_name).toEqual('master');
    });

    it('should fail closed (not a TypeError) when the identity realm relation is dangling', async () => {
        // a realm row deleted without cascade leaves data.realm undefined at
        // runtime — the issuer must throw a clean OAuth2 error, never a 500
        const repository = new FakeAuthorizationCodeRepository();
        const issuer = new OAuth2AuthorizationCodeIssuer(repository);

        const identity = buildIdentity();
        Reflect.deleteProperty(identity.data, 'realm');

        await expect(
            issuer.issue(request, identity),
        ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_REQUEST_INVALID }));
        expect(repository.saveCalls).toHaveLength(0);
    });
});
