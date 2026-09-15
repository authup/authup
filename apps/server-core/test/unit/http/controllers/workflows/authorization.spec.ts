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
import type { AuthorizationCatalog } from '@authup/access';
import {
    BuiltInPolicyType,
    PolicyData,
    createAuthorizationEvaluator,
} from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import type { OAuth2TokenPermission } from '@authup/specs';
import {
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyEntity,
    UserEntity,
    UserPermissionEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import { createTestApplication } from '../../../../app';
import { createFakeRealm, createFakeUser, httpRequest } from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

describe('src/http/controllers/workflows/authorization/*.ts', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('answers the identity-free catalog with every tree exactly once', async () => {
        const catalog = await suite.client.authorization.get();

        expect(catalog).not.toHaveProperty('identity');
        expect(catalog.permissions.length).toBeGreaterThanOrEqual(Object.values(PermissionName).length);
        for (const permission of catalog.permissions) {
            expect(permission).not.toHaveProperty('grants');
        }
        // every provisioned definition projects, so none is carried unevaluable
        expect(catalog.permissions.filter((permission) => permission.policies === null)).toEqual([]);

        const userRead = catalog.permissions.find((permission) => permission.name === PermissionName.USER_READ);
        expect(userRead).toMatchObject({ realm_id: null, client_id: null });
        expect(userRead?.policies).toHaveLength(1);

        const defaultPolicyId = userRead!.policies![0]!;
        const defaultPolicy = catalog.policies[defaultPolicyId];
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
        const defaults = Object.values(catalog.policies)
            .filter((tree) => tree.type === 'composite' &&
                (tree.children ?? []).some((child) => child.type === 'permissionBinding'));
        expect(defaults).toHaveLength(1);
        for (const tree of Object.values(catalog.policies)) {
            expect(tree).not.toHaveProperty('id');
            expect(tree).not.toHaveProperty('name');
            expect(tree).not.toHaveProperty('builtIn');
            expect(tree).not.toHaveProperty('createdAt');
        }

        const referenced = catalog.permissions.flatMap((permission) => permission.policies ?? []);
        expect(new Set(referenced).size).toBeLessThanOrEqual(Object.keys(catalog.policies).length);
        for (const id of referenced) {
            expect(catalog.policies[id]).toBeDefined();
        }
        expect(catalog.permissions.filter((permission) => (permission.policies ?? []).includes(defaultPolicyId)).length)
            .toBeGreaterThanOrEqual(Object.values(PermissionName).length);
    });

    it('is publicly cacheable and does not vary on the cookie', async () => {
        const response = await httpRequest(suite, 'GET', '/authorization');

        expect(response.status).toBe(200);
        // the body is a pure function of the permission and policy rows and of
        // no caller, so an intermediary may store it and revalidate
        expect(response.headers.get('cache-control')).toEqual('public, no-cache');
        expect(response.headers.get('vary') ?? '').not.toContain('cookie');
    });

    // The consumer this route exists for is typically a PUBLIC client: it holds
    // no secret, so it can obtain no token of its own and has no credential to
    // be gated on. Anonymous is therefore structural, not a convenience.
    it('answers an anonymous caller the same document as an admin', async () => {
        const anonymous = await httpRequest(suite, 'GET', '/authorization');
        expect(anonymous.status).toBe(200);

        const catalog : AuthorizationCatalog = await anonymous.json();
        expect(catalog).not.toHaveProperty('identity');
        expect(catalog.permissions.length).toBeGreaterThanOrEqual(Object.values(PermissionName).length);
        expect(catalog).toEqual(JSON.parse(JSON.stringify(await suite.client.authorization.get())));
    });

    // Presenting NO credential passes, presenting a BAD one does not: the
    // authorization middleware still runs, and it refuses a bearer that is not
    // a live access token before any route is reached.
    it('still refuses a malformed credential', async () => {
        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const refresh = await httpRequest(suite, 'GET', '/authorization', { headers: { Authorization: `Bearer ${grant.refresh_token}` } });

        expect(refresh.status).toBe(401);
    });

    // The gate used to be `GET /permissions`', which made the route unusable for
    // every ordinary user and for every credential-less client. The catalog is
    // an upper bound on what may be ASKED rather than an entitlement, so the two
    // surfaces deliberately diverge: the rules travel, the ROWS still do not.
    it('answers a user holding no permission at all, while the entity read still refuses them', async () => {
        const password = 'start123-authorization';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const ungranted = await suite.client.token.createWithPassword({ username: user.name, password });
        const headers = { Authorization: `Bearer ${ungranted.access_token}` };

        const response = await httpRequest(suite, 'GET', '/authorization', { headers });
        expect(response.status).toBe(200);
        const catalog : AuthorizationCatalog = await response.json();
        expect(catalog.permissions.length).toBeGreaterThanOrEqual(Object.values(PermissionName).length);

        const entities = await httpRequest(suite, 'GET', '/permissions', { headers });
        expect(entities.status).toBe(403);
        expect((await entities.json()).code).toEqual(ErrorCode.PERMISSION_EVALUATION_FAILED);
    });

    // The deliberate disclosure, stated as a test so it cannot change by
    // accident: a foreign realm's definition and its policy configuration
    // travel to every caller, because the document is one shared catalog.
    it('carries another realm\'s definition whole, to an anonymous caller included', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { data: foreign } = await suite.client.permission.create({
            name: `plan109_foreign_${realm.name}`,
            realmId: realm.id,
        });
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy({ realmId: realm.id }));
        await suite.client.permissionPolicy.create({ permissionId: foreign.id, policyId: policy.id });

        const response = await httpRequest(suite, 'GET', '/authorization');
        expect(response.status).toBe(200);

        const catalog : AuthorizationCatalog = await response.json();
        const entry = catalog.permissions.find((item) => item.name === foreign.name);
        expect(entry).toBeDefined();
        expect(entry!.realm_id).toEqual(realm.id);
        expect(entry!.policies).toContain(policy.id);
        expect(catalog.policies[policy.id]).toHaveProperty('type', BuiltInPolicyType.TIME);
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

        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const introspection = await suite.client.token.introspect({ token: grant.access_token }, { authorizationHeaderInherit: true });
        expect(introspection.active).toBe(true);
        expect(introspection.sub).toEqual(user.id);
        const catalog : AuthorizationCatalog = JSON.parse(JSON.stringify(await suite.client.authorization.get()));
        const evaluator = await createAuthorizationEvaluator({
            catalog,
            grants: introspection.permissions,
            identity: {
                id: user.id,
                type: introspection.sub_kind,
                realmId: introspection.realm_id,
                realmName: introspection.realm_name,
            },
        });
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

    it('carries the junction policy a grant names, so a restricted grant round-trips into the evaluator', async () => {
        const user = await suite.dataSource.getRepository(UserEntity).findOneByOrFail({ name: 'admin' });
        const binding = await suite.dataSource.getRepository(PolicyEntity).findOneByOrFail({ type: BuiltInPolicyType.PERMISSION_BINDING });
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);

        const { data: restriction } = await suite.client.policy.create({
            name: randomUUID(),
            type: BuiltInPolicyType.ATTRIBUTES,
            query: { visible: { $eq: true } },
        });
        const permission = await permissionRepository.save(permissionRepository.create({ name: randomUUID() }));
        await permissionPolicyRepository.save(permissionPolicyRepository.create({ permissionId: permission.id, policyId: binding.id }));
        await userPermissionRepository.save(userPermissionRepository.create({
            userId: user.id,
            userRealmId: user.realmId,
            permissionId: permission.id,
            permissionRealmId: null,
            realmScope: 'any',
            policyId: restriction.id,
        }));
        await suite.dataSource.queryResultCache?.clear();

        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const introspection = await suite.client.token.introspect({ token: grant.access_token }, { authorizationHeaderInherit: true });
        const entries = (introspection.permissions ?? []).filter((entry: OAuth2TokenPermission) => entry.name === permission.name);
        expect(entries).toEqual([{
            name: permission.name,
            realm_id: null,
            client_id: null,
            realm_scope: 'any',
            policies: [restriction.id],
        }]);

        const catalog : AuthorizationCatalog = JSON.parse(JSON.stringify(await suite.client.authorization.get()));
        expect(catalog.policies[restriction.id]).toMatchObject({
            type: BuiltInPolicyType.ATTRIBUTES,
            query: { visible: { $eq: true } },
        });
        expect(catalog.permissions.some((entry) => entry.policies?.includes(restriction.id))).toBe(false);

        const evaluator = await createAuthorizationEvaluator({
            catalog,
            grants: introspection.permissions,
            identity: {
                id: user.id,
                type: introspection.sub_kind,
                realmId: introspection.realm_id,
                realmName: introspection.realm_name,
            },
        });
        const row = (visible: boolean) => new PolicyData({
            [BuiltInPolicyType.REALM_MATCH]: user.realmId,
            [BuiltInPolicyType.ATTRIBUTES]: { realmId: user.realmId, visible },
        });
        await expect(evaluator.evaluate({ name: permission.name, data: row(true) })).resolves.toBeUndefined();
        await expect(evaluator.evaluate({ name: permission.name, data: row(false) })).rejects.toThrow();

        const compiled = await evaluator.compile({ name: permission.name });
        expect(compiled.verdict).toBe('conditional');
        const predicate = compiled.verdict === 'conditional' ?
            compileFilters(compiled.condition as IFilter | IFilters, { caseSensitive: true }) :
            () => false;
        expect(!!predicate({ realmId: user.realmId, visible: true })).toBe(true);
        expect(!!predicate({ realmId: user.realmId, visible: false })).toBe(false);
    });

    it('omits a grant whose junction policy the catalog cannot carry, so the evaluator denies rather than reads stale', async () => {
        const user = await suite.dataSource.getRepository(UserEntity).findOneByOrFail({ name: 'admin' });
        const binding = await suite.dataSource.getRepository(PolicyEntity).findOneByOrFail({ type: BuiltInPolicyType.PERMISSION_BINDING });
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permissionPolicyRepository = suite.dataSource.getRepository(PermissionPolicyEntity);
        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);

        const { data: unsupported } = await suite.client.policy.create({ name: randomUUID(), type: 'plan109custom' });
        const permission = await permissionRepository.save(permissionRepository.create({ name: randomUUID() }));
        await permissionPolicyRepository.save(permissionPolicyRepository.create({ permissionId: permission.id, policyId: binding.id }));
        await userPermissionRepository.save(userPermissionRepository.create({
            userId: user.id,
            userRealmId: user.realmId,
            permissionId: permission.id,
            permissionRealmId: null,
            realmScope: 'any',
            policyId: unsupported.id,
        }));
        await suite.dataSource.queryResultCache?.clear();

        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const introspection = await suite.client.token.introspect({ token: grant.access_token }, { authorizationHeaderInherit: true });
        expect((introspection.permissions ?? []).some((entry: OAuth2TokenPermission) => entry.name === permission.name)).toBe(false);

        const catalog : AuthorizationCatalog = JSON.parse(JSON.stringify(await suite.client.authorization.get()));
        expect(catalog.policies).not.toHaveProperty(unsupported.id);
        expect(catalog.permissions.some((entry) => entry.name === permission.name)).toBe(true);

        const evaluator = await createAuthorizationEvaluator({
            catalog,
            grants: introspection.permissions,
            identity: {
                id: user.id,
                type: introspection.sub_kind,
                realmId: introspection.realm_id,
                realmName: introspection.realm_name,
            },
        });
        await expect(evaluator.evaluate({
            name: permission.name,
            data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: user.realmId }),
        })).rejects.toThrow();
        expect(await evaluator.compile({ name: permission.name })).toEqual({ verdict: 'deny' });
    });
});
