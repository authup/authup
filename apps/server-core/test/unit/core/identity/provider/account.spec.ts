/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { BuiltInPolicyType } from '@authup/access';
import type { PolicyData } from '@authup/access';
import type { OAuth2IdentityProvider, Realm, User } from '@authup/core-kit';
import { IdentityProviderProtocol, buildUserFakeEmail } from '@authup/core-kit';
import { EntityConflictError, ErrorCode } from '@authup/errors';
import { createNanoID } from '@authup/kit';
import type { IdentityProviderAccountManagerContext, IdentityProviderIdentity } from '../../../../../src/core';
import {
    IdentityProviderAccountManager,
    IdentityProviderAttributeMapper,
    IdentityProviderPermissionMapper,
    IdentityProviderRoleMapper,
} from '../../../../../src/core';
import { IdentityProviderEnrollmentDeniedError } from '../../../../../src/core/identity/provider/account/enrollment-error.ts';
import type {
    IOAuth2AccessPolicyEvaluator,
    OAuth2AccessPolicyEvaluateDataOptions,
} from '../../../../../src/core/oauth2/access-policy/types.ts';
import claims from '../../../../data/jwt.json';
import {
    IdentityProviderAccountEntity,
    IdentityProviderAccountRepositoryAdapter,
    IdentityProviderAttributeMappingEntity,
    IdentityProviderAttributeMappingRepository,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderPermissionMappingRepository,
    IdentityProviderRepository,
    IdentityProviderRoleMappingEntity,
    IdentityProviderRoleMappingRepository,
    PathEntity,
    PathRepositoryAdapter,
    PermissionEntity,
    RealmEntity,
    RoleEntity,
    UserEntity,
    UserIdentityRepository,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../src';
import { RealmRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/realm/repository';
import { createTestApplication } from '../../../../app';

describe('core/identity/provider/account', () => {
    const suite = createTestApplication();

    let realm : Realm;

    let provider : OAuth2IdentityProvider;

    let accountManager : IdentityProviderAccountManager;

    let accountManagerContext : IdentityProviderAccountManagerContext;

    let accountRepository : IdentityProviderAccountRepositoryAdapter;

    let identity : IdentityProviderIdentity;

    beforeAll(async () => {
        await suite.setup();

        const realmRepository = new RealmRepositoryAdapter(
            suite.dataSource.getRepository(RealmEntity),
        );
        realm = await realmRepository.resolve('', true);

        const repository = new IdentityProviderRepository(suite.dataSource);
        provider = {
            authorizeUrl: '',
            tokenUrl: '',
            name: 'keycloak',
            enabled: true,
            protocol: IdentityProviderProtocol.OAUTH2,
            clientId: 'client',
            clientSecret: 'start123',
            realmId: realm.id,
        } as OAuth2IdentityProvider;

        await repository.save(provider);

        identity = {
            id: 'foo',
            data: claims,
            attributeCandidates: { name: ['fooBarBaz'] },
            provider,
        };

        const attributeMapperRepository = new IdentityProviderAttributeMappingRepository(suite.dataSource);
        const attributeMapper = new IdentityProviderAttributeMapper(attributeMapperRepository);

        const roleMapperFinder = new IdentityProviderRoleMappingRepository(suite.dataSource);
        const roleMapper = new IdentityProviderRoleMapper(roleMapperFinder);

        const permissionMapperRepository = new IdentityProviderPermissionMappingRepository(suite.dataSource);
        const permissionMapper = new IdentityProviderPermissionMapper(permissionMapperRepository);

        accountRepository = new IdentityProviderAccountRepositoryAdapter(suite.dataSource);

        const userRepository = new UserIdentityRepository({
            repository: new UserRepository(suite.dataSource),
            userPermissionRepository: suite.dataSource.getRepository(UserPermissionEntity),
            userRoleRepository: suite.dataSource.getRepository(UserRoleEntity),
        });

        accountManagerContext = {
            attributeMapper,
            roleMapper,
            permissionMapper,
            userRepository,
            repository: accountRepository,
            pathRepository: new PathRepositoryAdapter({
                repository: suite.dataSource.getRepository(PathEntity),
                realmRepository: suite.dataSource.getRepository(RealmEntity),
            }),
        };
        accountManager = new IdentityProviderAccountManager(accountManagerContext);
    });

    afterAll(async () => {
        await suite.teardown();

        realm = undefined as unknown as Realm;
        accountManager = undefined as unknown as IdentityProviderAccountManager;
    });

    it('should create user', async () => {
        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).toEqual('foobarbaz');
        expect(account.user.email).toEqual(buildUserFakeEmail('foobarbaz'));
    });

    it('should create user with alternative name', async () => {
        const account = await accountManager.save({
            data: claims,
            id: 'bar',
            attributeCandidates: {
                name: [
                    'admin', // exists
                    '', // invalid due validation rules
                    'bar', // valid
                ],
            },
            provider,
        });

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).toEqual('bar');
        expect(account.user.email).toEqual(buildUserFakeEmail('bar'));
    });

    it('should create user with random name', async () => {
        const account = await accountManager.save({
            data: claims,
            id: 'baz',
            attributeCandidates: {
                name: [
                    'admin', // exists
                ],
            },
            provider,
        });

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).not.toEqual('admin');
    });

    it('should create user only once', async () => {
        let account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const accountId = account.id;
        const userId = account.user.id;

        account = await accountManager.save(identity);
        expect(account).toBeDefined();

        expect(account.id).toEqual(accountId);
        expect(account.user.id).toEqual(userId);
    });

    it('should keep one external identity on one user', async () => {
        const account = await accountManager.save(identity);
        // a user without any link, so only the (providerUserId, providerId)
        // index can reject
        const userRepository = suite.dataSource.getRepository(UserEntity);
        const other = await userRepository.save(userRepository.create({
            name: 'qux', 
            email: buildUserFakeEmail('qux'), 
            realmId: realm.id,
        }));

        // straight through the adapter, past the manager's own pre-check:
        // the unique index answers, translated into the domain conflict
        await expect(accountRepository.save({
            providerId: provider.id,
            providerUserId: identity.id,
            providerRealmId: provider.realmId,
            userId: other.id,
            userRealmId: other.realmId,
        })).rejects.toBeInstanceOf(EntityConflictError);

        const linked = await accountRepository.findOneByProviderIdentity(identity);
        expect(linked?.id).toEqual(account.id);
        expect(linked?.userId).toEqual(account.user.id);
    });

    it('should converge the loser of two concurrent first logins onto the winner', async () => {
        const buildRacer = () : IdentityProviderIdentity => ({
            data: claims,
            id: 'racer',
            attributeCandidates: { name: ['racer'] },
            provider,
        });
        const winner = await accountManager.save(buildRacer());

        const users = suite.dataSource.getRepository(UserEntity);
        const accounts = suite.dataSource.getRepository(IdentityProviderAccountEntity);
        const usersBefore = await users.count();

        // the loser read "not linked" before the winner's insert landed; only
        // the unique index sees the winner
        vi.spyOn(accountRepository, 'findOneByProviderIdentity').mockResolvedValueOnce(null);
        const loser = await accountManager.save(buildRacer());

        expect(loser.id).toEqual(winner.id);
        expect(loser.user.id).toEqual(winner.user.id);
        expect(await accounts.countBy({ providerId: provider.id, providerUserId: 'racer' })).toEqual(1);
        // the user the loser provisioned is gone again
        expect(await users.count()).toEqual(usersBefore);
    });

    it('should synchronize roles', async () => {
        const roleRepository = suite.dataSource.getRepository(RoleEntity);
        const role = roleRepository.create({ name: createNanoID() });

        await roleRepository.save(role);

        const idpRoleMappingRepository = suite.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const idpRoleMapping = idpRoleMappingRepository.create({
            synchronizationMode: 'always',
            name: 'realm_access.roles.*',
            value: 'movies:read',
            roleId: role.id,
            roleRealmId: role.realmId,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        });

        await idpRoleMappingRepository.save(idpRoleMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userRoleRepository = suite.dataSource.getRepository(UserRoleEntity);
        const userRole = await userRoleRepository.find({
            where: {
                roleId: role.id,
                userId: account.userId,
            },
        });

        expect(userRole).toBeDefined();
    });

    it('should not synchronize roles', async () => {
        const roleRepository = suite.dataSource.getRepository(RoleEntity);
        const role = roleRepository.create({ name: createNanoID() });

        await roleRepository.save(role);

        const roleMappingRepository = suite.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const roleMapping = roleMappingRepository.create({
            synchronizationMode: 'always',
            name: 'realm_access.roles.*',
            value: 'admin',
            roleId: role.id,
            roleRealmId: role.realmId,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        });

        await roleMappingRepository.save(roleMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userRoleRepository = suite.dataSource.getRepository(UserRoleEntity);
        const userRole = await userRoleRepository.findOne({
            where: {
                roleId: role.id,
                userId: account.userId,
            },
        });

        expect(userRole).toEqual(null);
    });

    it('should synchronize permissions', async () => {
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = permissionRepository.create({ name: createNanoID() });

        await permissionRepository.save(permission);

        const idpPermissionMappingRepository = suite.dataSource.getRepository(IdentityProviderPermissionMappingEntity);
        const idpPermissionMapping = idpPermissionMappingRepository.create({
            synchronizationMode: 'always',
            name: 'realm_access.roles.*',
            value: 'movies:read',
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permissionId: permission.id,
                userId: account.userId,
            },
        });

        expect(userPermission).toBeDefined();

        await userPermissionRepository.remove(userPermission!);
    });

    it('should not synchronize permissions', async () => {
        const permissionRepository = suite
            .dataSource
            .getRepository(PermissionEntity);

        const permission = permissionRepository.create({ name: createNanoID() });

        await permissionRepository.save(permission);

        const idpPermissionMappingRepository = suite
            .dataSource
            .getRepository(IdentityProviderPermissionMappingEntity);

        const idpPermissionMapping = idpPermissionMappingRepository.create({
            synchronizationMode: 'always',
            name: 'realm_access.roles.*',
            value: 'admin',
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permissionId: permission.id,
                userId: account.userId,
            },
        });

        expect(userPermission).toEqual(null);
    });

    it('should clear emailVerified when a mapped address differs from the stored one', async () => {
        const mappings = suite.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const mapping = await mappings.save(mappings.create({
            synchronizationMode: 'always',
            targetName: 'email',
            targetValue: 'mapped@example.com',
            providerId: provider.id,
            providerRealmId: provider.realmId,
        }));

        const buildIdentity = () : IdentityProviderIdentity => ({
            data: claims,
            id: 'mailer',
            attributeCandidates: { name: ['mailer'] },
            provider,
        });
        const created = await accountManager.save(buildIdentity());
        expect(created.user.email).toEqual('mapped@example.com');

        // the address was changed and vouched for in authup meanwhile
        const users = suite.dataSource.getRepository(UserEntity);
        await users.update(created.user.id, { email: 'verified@example.com', emailVerified: true });

        await accountManager.save(buildIdentity());

        const row = await users.findOne({
            where: { id: created.user.id },
            select: {
                id: true, 
                email: true, 
                emailVerified: true, 
            },
        });
        expect(row?.email).toEqual('mapped@example.com');
        expect(row?.emailVerified).toEqual(false);

        await mappings.remove(mapping);
    });

    it('should keep emailVerified when the mapped address matches the stored one', async () => {
        const mappings = suite.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const mapping = await mappings.save(mappings.create({
            synchronizationMode: 'always',
            targetName: 'email',
            targetValue: 'same@example.com',
            providerId: provider.id,
            providerRealmId: provider.realmId,
        }));

        const buildIdentity = () : IdentityProviderIdentity => ({
            data: claims,
            id: 'mailer-same',
            attributeCandidates: { name: ['mailer-same'] },
            provider,
        });
        const created = await accountManager.save(buildIdentity());

        const users = suite.dataSource.getRepository(UserEntity);
        await users.update(created.user.id, { emailVerified: true });

        await accountManager.save(buildIdentity());

        const row = await users.findOne({
            where: { id: created.user.id },
            select: {
                id: true,
                email: true,
                emailVerified: true,
            },
        });
        expect(row?.email).toEqual('same@example.com');
        expect(row?.emailVerified).toEqual(true);

        await mappings.remove(mapping);
    });

    it('should file a provisioned user under sources/<provider>', async () => {
        const account = await accountManager.save({
            data: claims,
            id: 'filed',
            attributeCandidates: { name: ['filed'] },
            provider,
        });

        const paths = suite.dataSource.getRepository(PathEntity);
        const folder = await paths.findOneBy({
            path: 'sources/keycloak',
            realmId: realm.id,
        });

        expect(folder).not.toBeNull();
        expect(account.user.pathId).toEqual(folder!.id);

        const parent = await paths.findOneBy({ id: folder!.parentId! });
        expect(parent?.path).toEqual('sources');
    });

    it('should keep the folder on a second login', async () => {
        const buildIdentity = () : IdentityProviderIdentity => ({
            data: claims,
            id: 'refiled',
            attributeCandidates: { name: ['refiled'] },
            provider,
        });
        const created = await accountManager.save(buildIdentity());

        const paths = suite.dataSource.getRepository(PathEntity);
        const source = await paths.findOneBy({
            path: 'sources/keycloak',
            realmId: realm.id,
        });
        expect(source).not.toBeNull();
        expect(created.user.pathId).toEqual(source!.id);

        // an operator moved the user out of the provider's folder
        const target = await paths.save(paths.create({
            name: 'staff',
            path: 'staff',
            realmId: realm.id,
        }));

        const users = suite.dataSource.getRepository(UserEntity);
        await users.update(created.user.id, { pathId: target.id });

        await accountManager.save(buildIdentity());

        const row = await users.findOneBy({ id: created.user.id });
        expect(row?.pathId).toEqual(target.id);
    });

    it('should let a mapping win', async () => {
        const paths = suite.dataSource.getRepository(PathEntity);
        const folder = await paths.save(paths.create({
            name: 'mapped',
            path: 'mapped',
            realmId: realm.id,
        }));

        const mappings = suite.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const mapping = await mappings.save(mappings.create({
            synchronizationMode: 'always',
            targetName: 'pathId',
            targetValue: folder.id,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        }));

        const pathsBefore = await paths.count();

        const account = await accountManager.save({
            data: claims,
            id: 'mapped-folder',
            attributeCandidates: { name: ['mapped-folder'] },
            provider,
        });

        expect(account.user.pathId).toEqual(folder.id);
        // the default never ran, so it created no folder of its own
        expect(await paths.count()).toEqual(pathsBefore);

        await mappings.remove(mapping);
    });

    it('should refuse a mapping naming a folder of another realm', async () => {
        const realms = suite.dataSource.getRepository(RealmEntity);
        const foreignRealm = await realms.save(realms.create({ name: `foreign-${createNanoID()}` }));

        const paths = suite.dataSource.getRepository(PathEntity);
        const folder = await paths.save(paths.create({
            name: 'foreign',
            path: 'foreign',
            realmId: foreignRealm.id,
        }));

        const mappings = suite.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const mapping = await mappings.save(mappings.create({
            synchronizationMode: 'always',
            targetName: 'pathId',
            targetValue: folder.id,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        }));

        const users = suite.dataSource.getRepository(UserEntity);

        // the folder is realm-bound and the `path` relation is ungated, so a
        // foreign folder would travel on every list read of this realm
        await expect(accountManager.save({
            data: claims,
            id: 'foreign-folder',
            attributeCandidates: { name: ['foreign-folder'] },
            provider,
        })).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });

        // the refusal lands before the write, so no user is provisioned
        expect(await users.findOneBy({ name: 'foreign-folder' })).toBeNull();
        expect(await accountRepository.findOneByProviderIdentity({
            id: 'foreign-folder',
            data: claims,
            provider,
        })).toBeNull();

        await mappings.remove(mapping);
        await paths.remove(folder);
        await realms.remove(foreignRealm);
    });

    /**
     * The provider's enrollment gate (#PR060): two extra attributes decide
     * whether a FIRST login for an unknown subject may create a user. The
     * manager reads them off `identity.provider`, so each case hands it a
     * copy of the provider carrying the attribute under test.
     */
    describe('enrollment gating', () => {
        type EvaluateDataCall = {
            policyId: string,
            data: PolicyData,
            options?: OAuth2AccessPolicyEvaluateDataOptions,
        };

        type Verdict = boolean | ((attributes: User) => boolean);

        class FakeEnrollmentPolicyEvaluator implements Pick<IOAuth2AccessPolicyEvaluator, 'evaluateData'> {
            public calls: EvaluateDataCall[] = [];

            protected verdict: Verdict;

            constructor(verdict: Verdict) {
                this.verdict = verdict;
            }

            async evaluateData(
                policyId: string,
                data: PolicyData,
                options?: OAuth2AccessPolicyEvaluateDataOptions,
            ): Promise<boolean> {
                this.calls.push({
                    policyId,
                    data,
                    options,
                });

                if (typeof this.verdict === 'function') {
                    return this.verdict(data.get<User>(BuiltInPolicyType.ATTRIBUTES));
                }

                return this.verdict;
            }
        }

        const buildIdentity = (id: string, gated: OAuth2IdentityProvider) : IdentityProviderIdentity => ({
            data: claims,
            id,
            attributeCandidates: { name: [id] },
            provider: gated,
        });

        const withAttributes = (attributes: Partial<OAuth2IdentityProvider>) : OAuth2IdentityProvider => ({
            ...provider,
            ...attributes,
        });

        it('should create an active user when the provider declares no gate', async () => {
            const account = await accountManager.save(buildIdentity('enrollment-open', provider));

            const users = suite.dataSource.getRepository(UserEntity);
            const row = await users.findOneBy({ id: account.user.id });
            expect(row?.name).toEqual('enrollment-open');
            expect(row?.active).toEqual(true);
        });

        it('should refuse a first login while enrollment is disabled', async () => {
            const gated = withAttributes({ enrollmentEnabled: false });

            await expect(accountManager.save(buildIdentity('enrollment-closed', gated)))
                .rejects.toBeInstanceOf(IdentityProviderEnrollmentDeniedError);

            // the gate runs before the first write, so nothing is left behind
            const users = suite.dataSource.getRepository(UserEntity);
            expect(await users.findOneBy({ name: 'enrollment-closed' })).toBeNull();
            expect(await accountRepository.findOneByProviderIdentity(buildIdentity('enrollment-closed', gated)))
                .toBeNull();
        });

        it('should keep a linked account logging in while enrollment is disabled', async () => {
            const linked = await accountManager.save(buildIdentity('enrollment-linked', provider));

            const gated = withAttributes({ enrollmentEnabled: false });
            const again = await accountManager.save(buildIdentity('enrollment-linked', gated));

            expect(again.id).toEqual(linked.id);
            expect(again.user.id).toEqual(linked.user.id);
        });

        it('should refuse a first login the enrollment policy denies', async () => {
            const evaluator = new FakeEnrollmentPolicyEvaluator(false);
            const manager = new IdentityProviderAccountManager({
                ...accountManagerContext,
                enrollmentPolicyEvaluator: evaluator,
            });

            const policyId = randomUUID();
            const gated = withAttributes({ enrollmentPolicyId: policyId });

            await expect(manager.save(buildIdentity('enrollment-denied', gated)))
                .rejects.toBeInstanceOf(IdentityProviderEnrollmentDeniedError);

            expect(evaluator.calls).toHaveLength(1);
            const [call] = evaluator.calls;
            expect(call.policyId).toEqual(policyId);
            expect(call.options).toEqual({ realmId: realm.id });
            // the bag is the validated row the login would have created, and
            // nothing else: no identity exists yet
            expect(call.data.has(BuiltInPolicyType.ATTRIBUTES)).toBe(true);
            expect(call.data.has(BuiltInPolicyType.IDENTITY)).toBe(false);
            expect(call.data.get<User>(BuiltInPolicyType.ATTRIBUTES)).toMatchObject({
                name: 'enrollment-denied',
                realmId: realm.id,
            });

            // the row as it would be stored: the provider's default folder is
            // resolved before the verdict, so a pathId rule can name it
            const folder = await suite.dataSource.getRepository(PathEntity)
                .findOneBy({ realmId: realm.id, path: 'sources/keycloak' });
            expect(folder).not.toBeNull();
            expect(call.data.get<User>(BuiltInPolicyType.ATTRIBUTES).pathId).toEqual(folder!.id);

            const users = suite.dataSource.getRepository(UserEntity);
            expect(await users.findOneBy({ name: 'enrollment-denied' })).toBeNull();
        });

        it('should create the user the enrollment policy permits', async () => {
            const evaluator = new FakeEnrollmentPolicyEvaluator(true);
            const manager = new IdentityProviderAccountManager({
                ...accountManagerContext,
                enrollmentPolicyEvaluator: evaluator,
            });

            const gated = withAttributes({ enrollmentPolicyId: randomUUID() });
            const account = await manager.save(buildIdentity('enrollment-permitted', gated));

            expect(account.user.name).toEqual('enrollment-permitted');
            expect(evaluator.calls).toHaveLength(1);

            const users = suite.dataSource.getRepository(UserEntity);
            expect(await users.findOneBy({ name: 'enrollment-permitted' })).not.toBeNull();
        });

        it('should decide the enrollment policy again when a name collision renames the row', async () => {
            // only corp- names may enroll; a local corp-alice already exists,
            // unlinked, so the save collides and the retry loop falls back to
            // the next upstream candidate, a name the policy never approved
            // read at call time: the bag is the row object itself, which the
            // retry loop renames in place after the first verdict
            const seen : string[] = [];
            const evaluator = new FakeEnrollmentPolicyEvaluator((attributes) => {
                seen.push(attributes.name);
                return attributes.name.startsWith('corp-');
            });
            const manager = new IdentityProviderAccountManager({
                ...accountManagerContext,
                enrollmentPolicyEvaluator: evaluator,
            });

            const users = suite.dataSource.getRepository(UserEntity);
            await users.save(users.create({
                name: 'corp-alice',
                email: buildUserFakeEmail('corp-alice'),
                realmId: realm.id,
            }));

            const gated = withAttributes({ enrollmentPolicyId: randomUUID() });
            const colliding = buildIdentity('enrollment-collision', gated);
            colliding.attributeCandidates = { name: ['corp-alice', 'mallory'] };

            await expect(manager.save(colliding))
                .rejects.toBeInstanceOf(IdentityProviderEnrollmentDeniedError);

            // the gate saw the approved name first and the renamed row second
            expect(seen).toEqual(['corp-alice', 'mallory']);

            expect(await users.findOneBy({ name: 'mallory' })).toBeNull();
            expect(await accountRepository.findOneByProviderIdentity(colliding)).toBeNull();
        });

        it('should refuse a first login when no evaluator is wired to decide the policy', async () => {
            // fail closed: the default manager of this suite carries none
            const gated = withAttributes({ enrollmentPolicyId: randomUUID() });

            await expect(accountManager.save(buildIdentity('enrollment-undecided', gated)))
                .rejects.toBeInstanceOf(IdentityProviderEnrollmentDeniedError);

            const users = suite.dataSource.getRepository(UserEntity);
            expect(await users.findOneBy({ name: 'enrollment-undecided' })).toBeNull();
        });
    });
});
