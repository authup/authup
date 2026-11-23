/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderProtocol } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import { PATH_SEGMENT_INVALID_ERROR_CODE, encodePathSegment, isClientError } from '../../src/index.ts';
import type { FakeClient } from '../../src/testing/index.ts';
import { createFakeClient } from '../../src/testing/index.ts';

type SegmentCall = (client: FakeClient, segment: string) => Promise<unknown>;

/**
 * Every API method that puts a caller-supplied id or name into a path.
 */
const calls : Record<string, SegmentCall> = {
    'client.getOne': (c, s) => c.client.getOne(s),
    'client.delete': (c, s) => c.client.delete(s),
    'client.update': (c, s) => c.client.update(s, {}),
    'client.createOrUpdate': (c, s) => c.client.createOrUpdate(s, { name: 'x' }),
    'client.rotateSecret': (c, s) => c.client.rotateSecret(s),
    'clientPermission.getOne': (c, s) => c.clientPermission.getOne(s),
    'clientPermission.delete': (c, s) => c.clientPermission.delete(s),
    'clientPermission.update': (c, s) => c.clientPermission.update(s, {}),
    'clientRole.getOne': (c, s) => c.clientRole.getOne(s),
    'clientRole.delete': (c, s) => c.clientRole.delete(s),
    'clientScope.getOne': (c, s) => c.clientScope.getOne(s),
    'clientScope.delete': (c, s) => c.clientScope.delete(s),
    'clientTokenExchangeCapability.getOne': (c, s) => c.clientTokenExchangeCapability.getOne(s),
    'clientTokenExchangeCapability.delete': (c, s) => c.clientTokenExchangeCapability.delete(s),
    'clientTokenExchangeCapability.update': (c, s) => c.clientTokenExchangeCapability.update(s, {}),
    'consent.getOne': (c, s) => c.consent.getOne(s),
    'consent.delete': (c, s) => c.consent.delete(s),
    'event.getOne': (c, s) => c.event.getOne(s),
    'identityProvider.getOne': (c, s) => c.identityProvider.getOne(s),
    'identityProvider.delete': (c, s) => c.identityProvider.delete(s),
    'identityProvider.update': (c, s) => c.identityProvider.update(s, { protocol: IdentityProviderProtocol.OAUTH2 }),
    'identityProvider.createOrUpdate': (c, s) => c.identityProvider.createOrUpdate(s, {
        name: 'x', 
        enabled: true, 
        protocol: IdentityProviderProtocol.OAUTH2, 
    }),
    'identityProviderAccount.getOne': (c, s) => c.identityProviderAccount.getOne(s),
    'identityProviderAccount.delete': (c, s) => c.identityProviderAccount.delete(s),
    'identityProviderRoleMapping.getOne': (c, s) => c.identityProviderRoleMapping.getOne(s),
    'identityProviderRoleMapping.delete': (c, s) => c.identityProviderRoleMapping.delete(s),
    'identityProviderRoleMapping.update': (c, s) => c.identityProviderRoleMapping.update(s, {}),
    'key.getOne': (c, s) => c.key.getOne(s),
    'key.delete': (c, s) => c.key.delete(s),
    'key.update': (c, s) => c.key.update(s, {}),
    'path.getOne': (c, s) => c.path.getOne(s),
    'path.delete': (c, s) => c.path.delete(s),
    'path.update': (c, s) => c.path.update(s, {}),
    'permission.getOne': (c, s) => c.permission.getOne(s),
    'permission.delete': (c, s) => c.permission.delete(s),
    'permission.update': (c, s) => c.permission.update(s, {}),
    'permission.createOrUpdate': (c, s) => c.permission.createOrUpdate(s, { name: 'x' }),
    'permission.check': (c, s) => c.permission.check(s),
    'permissionPolicy.getOne': (c, s) => c.permissionPolicy.getOne(s),
    'permissionPolicy.delete': (c, s) => c.permissionPolicy.delete(s),
    'policy.getOne': (c, s) => c.policy.getOne(s),
    'policy.delete': (c, s) => c.policy.delete(s),
    'policy.update': (c, s) => c.policy.update(s, {}),
    'policy.createOrUpdate': (c, s) => c.policy.createOrUpdate(s, { name: 'x', type: 'attribute' }),
    'policy.check': (c, s) => c.policy.check(s),
    'realm.getOne': (c, s) => c.realm.getOne(s),
    'realm.delete': (c, s) => c.realm.delete(s),
    'realm.update': (c, s) => c.realm.update(s, {}),
    'realm.createOrUpdate': (c, s) => c.realm.createOrUpdate(s, { name: 'x' }),
    'role.getOne': (c, s) => c.role.getOne(s),
    'role.delete': (c, s) => c.role.delete(s),
    'role.update': (c, s) => c.role.update(s, {}),
    'role.createOrUpdate': (c, s) => c.role.createOrUpdate(s, { name: 'x' }),
    'roleAttribute.getOne': (c, s) => c.roleAttribute.getOne(s),
    'roleAttribute.delete': (c, s) => c.roleAttribute.delete(s),
    'roleAttribute.update': (c, s) => c.roleAttribute.update(s, {}),
    'rolePermission.getOne': (c, s) => c.rolePermission.getOne(s),
    'rolePermission.delete': (c, s) => c.rolePermission.delete(s),
    'rolePermission.update': (c, s) => c.rolePermission.update(s, {}),
    'scope.getOne': (c, s) => c.scope.getOne(s),
    'scope.delete': (c, s) => c.scope.delete(s),
    'scope.update': (c, s) => c.scope.update(s, {}),
    'scope.createOrUpdate': (c, s) => c.scope.createOrUpdate(s, { name: 'x' }),
    'session.getOne': (c, s) => c.session.getOne(s),
    'session.delete': (c, s) => c.session.delete(s),
    'sessionToken.getOne': (c, s) => c.sessionToken.getOne(s),
    'sessionToken.delete': (c, s) => c.sessionToken.delete(s),
    'trustAnchor.getOne': (c, s) => c.trustAnchor.getOne(s),
    'trustAnchor.delete': (c, s) => c.trustAnchor.delete(s),
    'trustAnchor.update': (c, s) => c.trustAnchor.update(s, {}),
    'user.getOne': (c, s) => c.user.getOne(s),
    'user.delete': (c, s) => c.user.delete(s),
    'user.update': (c, s) => c.user.update(s, {}),
    'user.createOrUpdate': (c, s) => c.user.createOrUpdate(s, { name: 'x', email: 'x@example.com' }),
    'userAttribute.getOne': (c, s) => c.userAttribute.getOne(s),
    'userAttribute.delete': (c, s) => c.userAttribute.delete(s),
    'userAttribute.update': (c, s) => c.userAttribute.update(s, {}),
    'userAuthenticator.getMany (user)': (c, s) => c.userAuthenticator.getMany(s),
    'userAuthenticator.getOne (user)': (c, s) => c.userAuthenticator.getOne(s, 'a'),
    'userAuthenticator.getOne (id)': (c, s) => c.userAuthenticator.getOne('u', s),
    'userAuthenticator.delete (id)': (c, s) => c.userAuthenticator.delete('u', s),
    'userAuthenticator.enroll (user)': (c, s) => c.userAuthenticator.enroll(s, { kind: 'totp' }),
    'userAuthenticator.confirm (user)': (c, s) => c.userAuthenticator.confirm(s, 'a', { code: '123456' }),
    'userAuthenticator.confirm (id)': (c, s) => c.userAuthenticator.confirm('u', s, { code: '123456' }),
    'identityProvider.createLinkRequest': (c, s) => c.identityProvider.createLinkRequest(s),
    'identityProvider.completeLogin': (c, s) => c.identityProvider.completeLogin(s),
    'identityProvider.confirmLinkRequest': (c, s) => c.identityProvider.confirmLinkRequest(s, 'h'),
    'getJwk (id)': (c, s) => c.getJwk(s),
    'getJwk (realm)': (c, s) => c.getJwk('k', s),
    'userPermission.getOne': (c, s) => c.userPermission.getOne(s),
    'userPermission.delete': (c, s) => c.userPermission.delete(s),
    'userPermission.update': (c, s) => c.userPermission.update(s, {}),
    'userRole.getOne': (c, s) => c.userRole.getOne(s),
    'userRole.delete': (c, s) => c.userRole.delete(s),
};

describe('path segments', () => {
    it.each(['', '.', '..'])('should refuse %j', (value) => {
        try {
            encodePathSegment(value);
            expect.unreachable();
        } catch (e) {
            expect(isClientError(e)).toBe(true);
            expect((e as { code?: string }).code).toEqual(PATH_SEGMENT_INVALID_ERROR_CODE);
        }
    });

    it('should encode reserved characters and keep @ literal', () => {
        expect(encodePathSegment('a/b')).toEqual('a%2Fb');
        expect(encodePathSegment('x?force=1')).toEqual('x%3Fforce%3D1');
        expect(encodePathSegment('x#y')).toEqual('x%23y');
        expect(encodePathSegment('@me')).toEqual('@me');
        expect(encodePathSegment('admin.role')).toEqual('admin.role');
        expect(encodePathSegment(42)).toEqual('42');
    });

    describe.each(Object.entries(calls))('%s', (_name, call) => {
        it('should send nothing for a dot segment', async () => {
            const client = createFakeClient({ fallback: () => ({ data: [], meta: {} }) });

            await expect(call(client, '..')).rejects.toMatchObject({ code: PATH_SEGMENT_INVALID_ERROR_CODE });
            expect(client.requests).toHaveLength(0);
        });

        it('should encode a slash into the segment', async () => {
            const client = createFakeClient({ fallback: () => ({ data: [], meta: {} }) });

            await call(client, 'a/b');

            expect(client.requests).toHaveLength(1);
            expect(client.requests[0].url).toContain('a%2Fb');
            expect(client.requests[0].url).not.toContain('a/b');
        });
    });
});
