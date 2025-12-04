/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { useDataSource } from 'typeorm-extension';
import type { IdentityProviderAccount } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import type { FindOptionsWhere } from 'typeorm';
import { isUUID } from '@authup/kit';
import type { IdentityProviderEntity } from '../adapters/database/domains';
import { IdentityProviderRepository, UserEntity } from '../adapters/database/domains';
import type { IdentityProviderIdentity, LdapIdentityProviderFlowOptions } from './identity-provider';
import { IdentityProviderAccountService, LdapIdentityProviderFlow } from './identity-provider';

export class UserLdapAuthenticator {
    async authenticate(user: string, password: string, realmId?: string) : Promise<UserEntity | null> {
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
