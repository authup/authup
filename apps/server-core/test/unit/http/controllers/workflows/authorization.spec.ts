/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { compileFilters } from '@rapiq/adapter-memory';
import type { IFilter, IFilters } from '@rapiq/core';
import {
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it,
} from 'vitest';
import type { AuthorizationDocument } from '@authup/access';
import { BuiltInPolicyType, PolicyData, createAuthorizationEvaluator } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2TokenKind } from '@authup/specs';
import {
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyEntity,
    UserEntity,
    UserPermissionEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import { OAuth2InjectionToken } from '../../../../../src/app/modules/oauth2/constants';
import { createTestApplication } from '../../../../app';
import { httpRequest } from '../../../../utils';

describe('src/http/controllers/workflows/authorization/*.ts', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('answers the caller its own document with every tree exactly once', async () => {
        const document = await suite.client.authorization.get();

        expect(document.version).toBe(1);
        expect(document.identity.type).toBe('user');
        expect(document.permissions.length).toBeGreaterThan(50);

        const userRead = document.permissions.find((permission) => permission.name === PermissionName.USER_READ);
        expect(userRead).toMatchObject({
            realm_id: null, 
            client_id: null, 
            grants: [{ realm_scope: 'any', policies: [] }], 
        });
        expect(userRead?.policies).toHaveLength(1);

        const defaultPolicyId = userRead!.policies[0]!;
        const defaultPolicy = document.policies[defaultPolicyId];
        expect(defaultPolicy).toEqual({
            type: 'composite',
            decisionStrategy: 'unanimous',
            invert: false,
            children: expect.arrayContaining([
                expect.objectContaining({ type: 'identity' }),
                expect.objectContaining({ type: 'permissionBinding' }),
            ]),
        });
        expect(defaultPolicy?.children).toHaveLength(2);
        for (const tree of Object.values(document.policies)) {
            expect(tree).not.toHaveProperty('id');
            expect(tree).not.toHaveProperty('name');
            expect(tree).not.toHaveProperty('builtIn');
            expect(tree).not.toHaveProperty('createdAt');
        }

        const referenced = document.permissions.flatMap((permission) => [
            ...permission.policies,
            ...permission.grants.flatMap((grant) => grant.policies),
        ]);
        expect(new Set(referenced).size).toBeLessThanOrEqual(Object.keys(document.policies).length);
        for (const id of referenced) {
            expect(document.policies[id]).toBeDefined();
        }
        expect(document.permissions.filter((permission) => permission.policies.includes(defaultPolicyId)).length)
            .toBeGreaterThan(50);
    });

    it('sends no-store and varies on the cookie', async () => {
        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const response = await httpRequest(suite, 'GET', '/authorization', { headers: { Authorization: `Bearer ${grant.access_token}` } });

        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toEqual('no-store');
        expect(response.headers.get('vary')).toContain('cookie');
    });

    it('refuses an anonymous caller, a refresh token and a bearer without the global scope', async () => {
        const anonymous = await httpRequest(suite, 'GET', '/authorization');
        expect(anonymous.status).toBe(401);

        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const refresh = await httpRequest(suite, 'GET', '/authorization', { headers: { Authorization: `Bearer ${grant.refresh_token}` } });
        expect(refresh.status).toBe(401);

        const payload = await suite.client.token.introspect({ token: grant.access_token }, { authorizationHeaderInherit: true });
        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const restricted = await signer.sign({
            jti: randomUUID(),
            sub: payload.sub,
            sub_kind: payload.sub_kind,
            realm_id: payload.realm_id,
            client_id: payload.client_id,
            session_id: payload.session_id,
            iat: payload.iat,
            exp: payload.exp,
            scope: 'openid',
            kind: OAuth2TokenKind.ACCESS,
        });
        const response = await httpRequest(suite, 'GET', '/authorization', { headers: { Authorization: `Bearer ${restricted}` } });
        expect(response.status).toBe(403);
        expect((await response.json()).code).toEqual(ErrorCode.PERMISSION_DENIED);
    });

    it('exports each realm reach into identical row checks and query conditions', async () => {
        const user = await suite.dataSource.getRepository(UserEntity).findOneByOrFail({ name: 'admin' });
        const policy = await suite.dataSource.getRepository(PolicyEntity).findOneByOrFail({ type: BuiltInPolicyType.PERMISSION_BINDING });
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const cases = [
            ['none', [false, false, false]],
            ['own', [true, false, false]],
            ['ownOrNull', [true, false, true]],
            ['any', [true, true, true]],
        ] as const;
        const names : string[] = [];
        for (const [realmScope] of cases) {
            const permission = await permissionRepository.save(permissionRepository.create({ name: randomUUID() }));
            names.push(permission.name);
            await permissionPolicyRepository.save(permissionPolicyRepository.create({ permissionId: permission.id, policyId: policy.id }));
            await userPermissionRepository.save(userPermissionRepository.create({
                userId: user.id,
                userRealmId: user.realmId,
                permissionId: permission.id,
                permissionRealmId: null,
                realmScope,
            }));
        }
        await suite.dataSource.queryResultCache?.clear();

        const document : AuthorizationDocument = JSON.parse(JSON.stringify(await suite.client.authorization.get()));
        const evaluator = await createAuthorizationEvaluator(document);
        const rows = [user.realmId, randomUUID(), null].map((realmId) => ({ realmId }));
        for (const [index, [, expected]] of cases.entries()) {
            const name = names[index]!;
            const decisions = await Promise.all(rows.map(async ({ realmId }) => {
                try {
                    await evaluator.evaluate({ name, data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: realmId }) });
                    return true;
                } catch {
                    return false;
                }
            }));
            expect(decisions).toEqual(expected);

            const compiled = await evaluator.compile({ name });
            expect(compiled.verdict).not.toBe('post');
            const predicate = compiled.verdict === 'conditional' ?
                compileFilters(compiled.condition as IFilter | IFilters, { caseSensitive: true }) :
                () => compiled.verdict === 'allow';
            expect(rows.map((row) => !!predicate(row))).toEqual(expected);
        }
    });
});
