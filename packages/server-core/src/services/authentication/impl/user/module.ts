/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import { IdentityProviderProtocol, UserError } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { UserCredentialsService } from '../../../credential';
import type {
    IdentityProviderIdentity,
    LdapIdentityProviderFlowOptions,
} from '../../../identity-provider';
import {
    IdentityProviderAccountService,
    LdapIdentityProviderFlow,
} from '../../../identity-provider';
import { BaseAuthenticationService } from '../../base';
import type { IdentityProviderEntity } from '../../../../database/domains';
import { IdentityProviderRepository, UserEntity, UserRepository } from '../../../../database/domains';

export type UserAuthenticationServiceOptions = {
    /**
     * Enable ldap for authentication process.
     */
    withLDAP?: boolean
};

export class UserAuthenticationService extends BaseAuthenticationService<UserEntity> {
    protected options: UserAuthenticationServiceOptions;

    protected credentialsService : UserCredentialsService;

    constructor(options: UserAuthenticationServiceOptions = {}) {
        super();

        this.options = options;

        this.credentialsService = new UserCredentialsService();
    }

    async authenticate(name: string | UserEntity, secret: string, realmId?: string): Promise<UserEntity> {
        let entity: UserEntity;
        let withLDAP: boolean = false;

        if (typeof name === 'string') {
            entity = await this.resolve(name, realmId);

            if (
                !entity &&
                this.options.withLDAP
            ) {
                withLDAP = true;
                entity = await this.resolveWithLDAP(name, secret, realmId);
            }

            if (!entity) {
                throw UserError.credentialsInvalid();
            }
        } else {
            entity = name;
        }

        if (!withLDAP) {
            const verified = await this.credentialsService.verify(secret, entity);
            if (!verified) {
                throw UserError.credentialsInvalid();
            }
        }

        if (!entity.active) {
            throw UserError.inactive();
        }

        return entity;
    }

    async resolve(key: string, realmKey?: string): Promise<UserEntity | null> {
        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);
        const query = repository.createQueryBuilder('user')
            .leftJoinAndSelect('user.realm', 'realm');

        if (isUUID(key)) {
            query.where('user.id = :id', { id: key });
        } else {
            query.where('user.name = :name', { name: key });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('user.realm_id = :realmId', {
                        realmId: realmKey,
                    });
                } else {
                    query.andWhere('realm.name = :realmName', {
                        realmName: realmKey,
                    });
                }
            }
        }

        query.addSelect('user.password');

        return query.getOne();
    }

    async resolveWithLDAP(user: string, password: string, realmId?: string) : Promise<UserEntity | null> {
        const dataSource = await useDataSource();
        const repository = new IdentityProviderRepository(dataSource);

        const where: FindOptionsWhere<IdentityProviderEntity> = {
            protocol: IdentityProviderProtocol.LDAP,
        };

        if (realmId) {
            if (isUUID(realmId)) {
                where.realm_id = realmId;
            } else {
                where.realm = {
                    name: realmId,
                };
            }
        }

        const entities = await repository.findManyWithEA<LdapIdentityProviderFlowOptions>(
            {
                where,
                relations: ['realm'],
            },
        );

        let manager : IdentityProviderAccountService | undefined;
        let account : IdentityProviderAccount | undefined;
        let identity: IdentityProviderIdentity | undefined;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            if (entity.protocol !== IdentityProviderProtocol.LDAP) {
                continue;
            }

            const flow = new LdapIdentityProviderFlow(entity);

            try {
                identity = await flow.getIdentityForCredentials(user, password);
            } catch (e) {
                continue;
            } finally {
                await flow.unbind();
            }

            manager = new IdentityProviderAccountService(dataSource, entity);
            account = await manager.save(identity);
            break;
        }

        if (!account) {
            return null;
        }

        if (
            account.user &&
            account.user.realm
        ) {
            return account.user as UserEntity;
        }

        const userRepository = dataSource.getRepository(UserEntity);

        return userRepository.findOne({
            where: {
                id: account.user_id,
            },
            relations: ['realm'],
        });
    }
}
