/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount, OAuth2TokenGrantResponse } from '@authup/core';
import {
    IdentityProviderProtocol, OAuth2SubKind, ScopeName, UserError, extractObjectProperty,
} from '@authup/core';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import type { IdentityProviderEntity, IdentityProviderFlowIdentity } from '../../../domains';
import {
    IdentityProviderRepository,
    LdapIdentityProviderFlow, UserEntity, UserRepository, createIdentityProviderAccount,
    resolveRealm,
} from '../../../domains';
import { buildOAuth2BearerTokenResponse } from '../response';
import { AbstractGrant } from './abstract';
import type { Grant } from './type';

export class PasswordGrantType extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const user = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            remoteAddress: getRequestIP(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            sub: user.id,
            subKind: OAuth2SubKind.USER,
            realmId: user.realm.id,
            realmName: user.realm.name,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.tokenMaxAgeAccessToken,
            refreshToken,
            refreshTokenMaxAge: this.config.tokenMaxAgeRefreshToken,
        });
    }

    async validate(request: Request) : Promise<UserEntity> {
        const { username, password, realm_id: requestRealmId } = useRequestBody(request);

        const realm = await resolveRealm(
            useRequestParam(request, 'realmId') || requestRealmId,
        );

        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);
        const realmId = extractObjectProperty(realm, 'id');

        let entity = await repository.verifyCredentials(
            username,
            password,
            realmId,
        );

        if (!entity) {
            entity = await this.verifyCredentialsByLDAP(username, password, realmId);
        }

        if (!entity) {
            throw UserError.credentialsInvalid();
        }

        if (!entity.active) {
            throw UserError.inactive();
        }

        return entity;
    }

    protected async verifyCredentialsByLDAP(user: string, password: string, realmId?: string) : Promise<UserEntity> {
        const dataSource = await useDataSource();
        const repository = new IdentityProviderRepository(dataSource);
        let entities : IdentityProviderEntity[] = [];

        if (realmId) {
            entities = await repository.createQueryBuilder('provider')
                .where('provider.realm_id = :realmId', { realmId })
                .andWhere('provider.protocol = :protocol', { protocol: IdentityProviderProtocol.LDAP })
                .getMany();
        } else {
            entities = await repository.createQueryBuilder('provider')
                .andWhere('provider.protocol = :protocol', { protocol: IdentityProviderProtocol.LDAP })
                .getMany();
        }

        let account : IdentityProviderAccount | undefined;
        let identity: IdentityProviderFlowIdentity | undefined;

        for (let i = 0; i < entities.length; i++) {
            const entity = await repository.extendEntity(entities[i]);
            if (entity.protocol !== IdentityProviderProtocol.LDAP) {
                continue;
            }

            const flow = new LdapIdentityProviderFlow(entity);

            try {
                identity = await flow.getIdentityForCredentials(user, password);
                await flow.unbind();
            } catch (e) {
                await flow.unbind();
                continue;
            }

            account = await createIdentityProviderAccount(entity, identity);
            break;
        }

        if (!account) {
            return undefined;
        }

        if (account.user) {
            return account.user as UserEntity;
        }

        const userRepository = dataSource.getRepository(UserEntity);

        return userRepository.findOneBy({ id: account.user_id });
    }
}
