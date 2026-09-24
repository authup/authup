/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import type {
    IdentityProvider,
    IdentityProviderAccount,
    IdentityProviderEnrollmentAttributes,
    User,
} from '@authup/core-kit';
import {
    UserValidator,
    buildUserFakeEmail,
    isUserFakeEmail,
    joinPath,
} from '@authup/core-kit';
import { ValidatorGroup, createNanoID, extendObject } from '@authup/kit';
import { ValidationError, isEntityConflictError } from '@authup/errors';
import { isValidupError, stringifyPath } from 'validup';
import type { Logger } from '@authup/server-kit';
import { describeError } from '../../../../utils/index.ts';
import { ensurePath } from '../../../entities/path/helpers.ts';
import type { IPathRepository } from '../../../entities/path/types.ts';
import type { IOAuth2AccessPolicyEvaluator } from '../../../oauth2/access-policy/types.ts';
import type { IUserIdentityRepository } from '../../entities/index.ts';
import { IdentityProviderIdentityOperation } from '../constants.ts';
import type { IIdentityProviderMapper } from '../mapper/index.ts';
import { IdentityProviderMapperOperation } from '../mapper/index.ts';
import type { IdentityProviderIdentity } from '../types.ts';
import { IdentityProviderEnrollmentDeniedError } from './enrollment-error.ts';
import { IdentityProviderAccountAlreadyLinkedError } from './error.ts';
import type { IIdentityProviderAccountManager, IIdentityProviderAccountRepository, IdentityProviderAccountManagerContext } from './types.ts';

export class IdentityProviderAccountManager implements IIdentityProviderAccountManager {
    protected attributesMapper : IIdentityProviderMapper;

    protected permissionMapper : IIdentityProviderMapper;

    protected roleMapper : IIdentityProviderMapper;

    protected repository : IIdentityProviderAccountRepository;

    protected userRepository: IUserIdentityRepository;

    protected pathRepository: IPathRepository;

    protected userValidator : UserValidator;

    protected enrollmentPolicyEvaluator?: Pick<IOAuth2AccessPolicyEvaluator, 'evaluateData'>;

    protected logger?: Logger;

    constructor(ctx: IdentityProviderAccountManagerContext) {
        this.attributesMapper = ctx.attributeMapper;
        this.permissionMapper = ctx.permissionMapper;
        this.roleMapper = ctx.roleMapper;
        this.repository = ctx.repository;
        this.userRepository = ctx.userRepository;
        this.pathRepository = ctx.pathRepository;
        this.enrollmentPolicyEvaluator = ctx.enrollmentPolicyEvaluator;
        this.logger = ctx.logger;

        this.userValidator = new UserValidator();
    }

    async save(identity: IdentityProviderIdentity): Promise<IdentityProviderAccount> {
        let account = await this.repository.findOneByProviderIdentity(identity);
        if (account) {
            return this.update(identity, account);
        }

        identity.operation = IdentityProviderIdentityOperation.CREATE;

        const user = await this.saveUser(identity);

        try {
            account = await this.repository.save({
                providerId: identity.provider.id,
                providerUserId: identity.id,
                providerUserName: user.name, // todo: parse identity.name
                providerRealmId: identity.provider.realmId,
                user,
                userId: user.id,
                userRealmId: user.realmId,
            });
        } catch (e) {
            if (!isEntityConflictError(e)) {
                throw e;
            }

            // the loser of two concurrent first logins: the identity is linked
            // now, so continue with the winner's account and drop the user
            // this request provisioned moments ago (unreferenced; best effort,
            // a leftover row must not fail the login).
            const raced = await this.repository.findOneByProviderIdentity(identity);
            if (!raced) {
                throw e;
            }

            try {
                await this.userRepository.remove(user);
            } catch (removeError) {
                // The row is unreferenced, so it costs nothing but a squatted
                // user name. Left unreported it would be invisible forever.
                this.logger?.warn(describeError(
                    removeError,
                    `The user provisioned for the external identity "${identity.id}" could not be removed after losing a concurrent first login.`,
                ));
            }

            return this.update(identity, raced);
        }

        await this.saveRoles(identity, account.user);
        await this.savePermissions(identity, account.user);

        return account;
    }

    protected async update(
        identity: IdentityProviderIdentity,
        account: IdentityProviderAccount,
    ): Promise<IdentityProviderAccount> {
        identity.operation = IdentityProviderIdentityOperation.UPDATE;

        account.user = await this.saveUser(identity, account.user);

        await this.repository.save(account);

        await this.saveRoles(identity, account.user);
        await this.savePermissions(identity, account.user);

        return account;
    }

    async link(identity: IdentityProviderIdentity, userId: string): Promise<IdentityProviderAccount> {
        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new ValidationError('The linking user does not exist.');
        }

        if (
            identity.provider.realmId &&
            user.realmId !== identity.provider.realmId
        ) {
            throw new ValidationError('The provider and user realm do not match.');
        }

        const providerUserName = this.pickCandidate(identity, 'name', 256) ?? identity.id.slice(0, 256);
        const providerUserEmail = this.pickCandidate(identity, 'email', 512);

        const existing = await this.repository.findOneByProviderIdentity(identity);
        if (existing) {
            if (existing.userId !== userId) {
                throw new IdentityProviderAccountAlreadyLinkedError();
            }

            existing.providerUserName = providerUserName ?? existing.providerUserName;
            existing.providerUserEmail = providerUserEmail ?? existing.providerUserEmail;

            return this.repository.save(existing);
        }

        try {
            return await this.repository.save({
                providerId: identity.provider.id,
                providerUserId: identity.id,
                providerUserName,
                providerUserEmail: providerUserEmail ?? undefined,
                providerRealmId: identity.provider.realmId,
                userId,
                userRealmId: user.realmId ?? null,
            });
        } catch (e) {
            if (!isEntityConflictError(e)) {
                throw e;
            }

            // one of the two unique indexes fired; the re-read tells which:
            // a row for the identity means (providerUserId, providerId), a
            // race with the SAME user (two Connect tabs) being a no-op; no
            // row means (providerId, userId), the user already holds a link
            // at this provider through another external account.
            const raced = await this.repository.findOneByProviderIdentity(identity);
            if (raced) {
                if (raced.userId === userId) {
                    return raced;
                }

                throw new IdentityProviderAccountAlreadyLinkedError();
            }

            throw new ValidationError('The user is already linked to this identity provider through another account.');
        }
    }

    protected pickCandidate(
        identity: IdentityProviderIdentity,
        key: keyof User,
        maxLength: number,
    ): string | null {
        const candidates = identity.attributeCandidates?.[key] || [];
        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.length > 0) {
                return candidate.slice(0, maxLength);
            }
        }

        return null;
    }

    /**
     * The realm assert `UserService.save` runs, for the one write path that
     * never reaches it: `validateJoinColumns` and the database FK both prove
     * the folder exists and neither proves it belongs to the user's realm.
     */
    protected async assertPathRealm(pathId: string, realmId: string | null): Promise<void> {
        const path = await this.pathRepository.findOneById(pathId);
        if (!path) {
            throw new ValidationError('The path does not exist.');
        }

        if (!realmId) {
            throw new ValidationError('A path needs a realm.');
        }

        if (path.realmId !== realmId) {
            throw new ValidationError('The path belongs to another realm.');
        }
    }

    /**
     * The provider's enrollment gate (`enrollmentEnabled` /
     * `enrollmentPolicyId`) over the user row a FIRST login would create; a
     * linked account never reaches it. Runs over the FINAL row (the default
     * folder resolved) and before the user row is written, so a refused login
     * leaves no user row; the provider's `sources/<provider>` folder may exist
     * afterwards, which is per-provider decoration and names nobody. Runs
     * again whenever the name-collision retry renames the row, since a policy
     * that approved one name said nothing about the fallback the loop would
     * store instead.
     */
    protected async assertEnrollment(
        provider: IdentityProvider & IdentityProviderEnrollmentAttributes,
        attributes: User,
    ): Promise<void> {
        if (provider.enrollmentEnabled === false) {
            throw new IdentityProviderEnrollmentDeniedError(
                `The identity provider "${provider.name}" is not accepting new users.`,
            );
        }

        if (!provider.enrollmentPolicyId) {
            return;
        }

        if (!this.enrollmentPolicyEvaluator) {
            this.logger?.warn(
                `The identity provider "${provider.name}" carries an enrollment policy, but no evaluator is wired to decide it.`,
            );

            throw new IdentityProviderEnrollmentDeniedError(
                `The identity provider "${provider.name}" enrollment policy could not be evaluated.`,
            );
        }

        // ATTRIBUTES alone and no identity: there is no authenticated authup
        // actor yet, so an identity-bound policy denies by DATA_MISSING, the
        // anonymous posture POST /authorization/check documents.
        const allowed = await this.enrollmentPolicyEvaluator.evaluateData(
            provider.enrollmentPolicyId,
            new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: attributes }),
            { realmId: provider.realmId },
        );

        if (!allowed) {
            throw new IdentityProviderEnrollmentDeniedError(
                `The identity provider "${provider.name}" enrollment policy denied the user.`,
            );
        }
    }

    async saveUser(
        identity: IdentityProviderIdentity,
        user?: User,
    ): Promise<User> {
        const attributes = await this.attributesMapper.execute(
            identity,
        );

        const entity : Record<string, any> = {};
        for (const attribute of attributes) {
            if (
                attribute.key &&
                attribute.operation === IdentityProviderMapperOperation.CREATE
            ) {
                // attribute value might be object, array, ...
                entity[attribute.key] = attribute.value;
            }
        }

        if (!user) {
            entity.realmId = identity.provider.realmId;
            entity.active = true;
            entity.nameLocked = true;
            entity.clientId = identity.clientId || null;
        }

        const attributesSelf = await this.validateAttributes(entity, identity, 10);
        if (!attributesSelf) {
            // todo: better error name
            throw new Error('Identity provider attributes could not be validated.');
        }

        // A mapped `pathId` never passes through UserService.save, so the realm
        // assert every other write runs has to run here: the FK proves the
        // folder exists, not that it sits in the user's realm, and a foreign
        // folder would travel on every `GET /users?include=path` of this realm
        // (the relation is deliberately ungated).
        if (attributesSelf.pathId) {
            await this.assertPathRealm(
                attributesSelf.pathId,
                user ? user.realmId : identity.provider.realmId,
            );
        }

        if (!user && typeof attributesSelf.pathId === 'undefined') {
            // Authentik's user_path_template default: a user the provider
            // provisions is filed under sources/<provider> unless a mapping
            // placed it, and never refiled on a later login. A mapping that
            // says `null` has placed it too, so the key is tested for
            // PRESENCE. The folder is decoration with zero semantics, so a
            // failure here leaves the user unfiled rather than failing the
            // login.
            try {
                const folder = await ensurePath(
                    this.pathRepository,
                    identity.provider.realmId,
                    joinPath('sources', identity.provider.name),
                );
                attributesSelf.pathId = folder.id;
            } catch (e) {
                this.logger?.warn(describeError(e, 'The default identity provider folder could not be created.'));
            }
        }

        // After the default folder, so the policy decides the row as it will
        // be stored: a `pathId` rule that names the provider's own folder
        // would otherwise deny on the first pass and pass on the retry.
        if (!user) {
            await this.assertEnrollment(identity.provider, attributesSelf);
        }

        const attributesSelfKeys = Object.keys(attributesSelf);

        const attributesExtra : Record<string, any> = {};

        const entityKeys = Object.keys(entity);
        for (const entityKey of entityKeys) {
            const index = attributesSelfKeys.indexOf(entityKey);
            if (index !== -1) {
                continue;
            }

            attributesExtra[entityKey] = entity[entityKey];
        }

        if (
            user &&
            typeof attributesSelf.email === 'string' &&
            typeof attributesSelf.emailVerified === 'undefined'
        ) {
            // account.user is loaded under the default projection and carries
            // no email (select: false); a mapped address that differs from the
            // stored one drops its verification, as UserService.save does.
            const current = await this.userRepository.findOneById(user.id);
            if (current && current.email !== attributesSelf.email) {
                attributesSelf.emailVerified = false;
            }
        }

        let output : User;
        if (user) {
            output = extendObject(user, attributesSelf);
        } else {
            output = attributesSelf;
        }

        if (typeof output.name === 'string') {
            output.name = output.name.trim().toLowerCase();
        }

        let attempts = Math.max((identity.attributeCandidates?.name?.length || 0) + 1, 10);
        while (attempts > 0) {
            try {
                // todo: we also need to remove existing ones via idp login flow ( but not other attributes!)
                return await this.userRepository.saveOneWithEA(output, attributesExtra);
            } catch {
                const names = identity.attributeCandidates?.name || [];
                if (names.length > 0) {
                    while (names.length > 0) {
                        output.name = `${names.shift()}`.trim().toLowerCase();

                        try {
                            await this.userValidator.run(output, {
                                group: identity.operation === IdentityProviderIdentityOperation.CREATE ?
                                    ValidatorGroup.CREATE :
                                    ValidatorGroup.UPDATE,
                            });
                            break;
                        } catch {
                            // todo: do nothing.
                        }
                    }
                } else {
                    output.name = createNanoID('0123456789abcdefghijklmnopqrstuvwxyz-_', 10);
                }

                if (isUserFakeEmail(output.email)) {
                    output.email = buildUserFakeEmail(output.name);
                }

                // The renamed row is not the row the policy approved, on
                // exactly the field a name rule constrains.
                if (!user) {
                    await this.assertEnrollment(identity.provider, output);
                }

                attempts -= 1;
            }
        }

        throw new Error('The user account could not be created due a conflict error.');
    }

    async validateAttributes(
        entity: Record<string, any>,
        identity: IdentityProviderIdentity,
        attempts: number,
    ) : Promise<User | null> {
        attempts--;
        if (attempts <= 0) {
            return null;
        }

        try {
            return await this.userValidator.run(entity, {
                group: identity.operation === IdentityProviderIdentityOperation.CREATE ?
                    ValidatorGroup.CREATE :
                    ValidatorGroup.UPDATE,
            });
        } catch (e: any) {
            if (!isValidupError(e)) {
                return null;
            }

            let retry = false;
            for (let i = 0; i < e.issues.length; i++) {
                const child = e.issues[i];

                const pathNormalized = stringifyPath(child.path);

                if (
                    Array.isArray(entity[pathNormalized]) &&
                    entity[pathNormalized].length > 0
                ) {
                    const [first, ...rest] = entity[pathNormalized];
                    entity[pathNormalized] = first;

                    if (rest.length > 0) {
                        if (!identity.attributeCandidates) {
                            identity.attributeCandidates = {};
                        }

                        if (!identity.attributeCandidates[pathNormalized]) {
                            identity.attributeCandidates[pathNormalized] = [];
                        }

                        identity.attributeCandidates[pathNormalized]!.push(...rest);
                    }

                    retry = true;
                    break;
                }

                if (
                    identity.attributeCandidates &&
                    identity.attributeCandidates[pathNormalized] &&
                    identity.attributeCandidates[pathNormalized]!.length > 0
                ) {
                    entity[pathNormalized] = identity.attributeCandidates[pathNormalized]!.shift();
                    retry = true;
                    break;
                }

                if (
                    pathNormalized === 'email' &&
                    entity.name
                ) {
                    entity[pathNormalized] = buildUserFakeEmail(entity.name);
                    retry = true;
                    break;
                }

                if (entity[pathNormalized]) {
                    entity[pathNormalized] = null;
                    break;
                }
            }

            if (retry) {
                return this.validateAttributes(entity, identity, attempts);
            }

            return null;
        }
    }

    async savePermissions(
        identity: IdentityProviderIdentity,
        user: User,
    ) {
        const entities = await this.permissionMapper.execute(identity);

        await this.userRepository.savePermissions(user, entities);
    }

    async saveRoles(
        identity: IdentityProviderIdentity,
        user: User,
    ) {
        const entities = await this.roleMapper.execute(identity);

        await this.userRepository.saveRoles(user, entities);
    }
}
