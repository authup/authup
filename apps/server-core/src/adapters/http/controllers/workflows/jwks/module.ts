/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2JsonWebKey } from '@authup/specs';
import { JWKError, JWKType } from '@authup/specs';
import { AsymmetricKey } from '@authup/server-kit';
import {
    DContext,
    DController,
    DGet,
    DPath,
} from '@routup/decorators';
import type { IRoutupEvent } from 'routup';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import type { KeyEntity } from '../../../../database/domains/index.ts';
import { getRequestStringParam } from '../../../request/index.ts';

export type JwkControllerContext = {
    repository: Repository<KeyEntity>
};

@DController('')
export class JwkController {
    protected repository: Repository<KeyEntity>;

    constructor(ctx: JwkControllerContext) {
        this.repository = ctx.repository;
    }

    @DGet('/jwks', [])
    async getManyJwks(
        @DContext() event: IRoutupEvent,
    ): Promise<{ keys: OAuth2JsonWebKey[] }> {
        const realmId = getRequestStringParam(event, 'realmId');

        const entities = await this.repository.find({
            where: {
                type: In([JWKType.RSA, JWKType.EC]),
                ...(realmId ? { realm_id: realmId } : {}),
            },
            order: { priority: 'DESC' },
        });

        const promises = entities
            .filter((entity): entity is KeyEntity & { encryption_key: string } => !!entity.encryption_key)
            .map(
                (entity) => AsymmetricKey
                    .fromBase64({
                        format: 'spki',
                        key: entity.encryption_key,
                        options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signature_algorithm),
                    })
                    .then((container) => container.toJWK())
                    .then((key) => ({
                        ...key,
                        kid: entity.id,
                        alg: entity.signature_algorithm,
                    })),
            );

        const keys = await Promise.all(promises);

        return { keys };
    }

    @DGet('/jwks/:id', [])
    async getOneJwks(@DPath('id') id: string): Promise<OAuth2JsonWebKey> {
        const entity = await this.repository.findOne({
            where: {
                type: In([JWKType.RSA, JWKType.EC]),
                id,
            },
        });

        if (!entity) {
            throw JWKError.notFound(id);
        }

        if (!entity.encryption_key) {
            throw JWKError.encryptionKeyMissing();
        }

        const container = await AsymmetricKey
            .fromBase64({
                format: 'spki',
                key: entity.encryption_key,
                options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signature_algorithm),
            });

        const jsonWebKey = await container.toJWK();

        return {
            ...jsonWebKey,
            kid: entity.id,
            alg: entity.signature_algorithm,
        };
    }
}
