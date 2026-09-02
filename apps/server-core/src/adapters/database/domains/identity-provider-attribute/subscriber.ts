/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityDefaultEventName, IdentityProviderAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { EntityManager } from 'typeorm';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { IdentityProviderAttributeEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class IdentityProviderAttributeSubscriber extends EntitySubscriber<IdentityProviderAttribute> {
    constructor() {
        super({
            type: EntityType.IDENTITY_PROVIDER_ATTRIBUTE,
            target: IdentityProviderAttributeEntity,
            destinations: buildEntityDestinations(EntityType.IDENTITY_PROVIDER_ATTRIBUTE),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.IDENTITY_PROVIDER_ATTRIBUTE,
                        key: data.id,
                    }),
                ],
            },
        });
    }

    /**
     * The row's `value` holds the provider's OAuth2 clientSecret or LDAP bind
     * password, so it must never reach the realtime bus. Stripped on both
     * sides: the previous payload is what an update would otherwise carry the
     * OLD secret in.
     */
    protected override async publish(
        event: `${EntityDefaultEventName}`,
        data: IdentityProviderAttribute,
        dataPrevious?: IdentityProviderAttribute,
        transaction?: EntityManager,
    ): Promise<void> {
        await super.publish(
            event,
            { ...data, value: null },
            dataPrevious ? { ...dataPrevious, value: null } : undefined,
            transaction,
        );
    }
}
