/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AsymmetricKey } from '@authup/server-kit';
import type { OAuth2JsonWebKey } from '@authup/specs';
import { JWKType } from '@authup/specs';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { KeyEntity } from '../../../../../database/domains/index.ts';

export async function getJwksRouteHandler(
    repository: Repository<KeyEntity>,
    realmId?: string,
) : Promise<{ keys: OAuth2JsonWebKey[] }> {
    const entities = await repository.find({
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

    return { keys: keys as OAuth2JsonWebKey[] };
}

export async function getJwkRouteHandler(
    repository: Repository<KeyEntity>,
    keyId: string,
    realmId?: string,
) : Promise<OAuth2JsonWebKey> {
    const entity = await repository.findOne({
        where: {
            type: In([JWKType.RSA, JWKType.EC]),
            id: keyId,
            ...(realmId ? { realm_id: realmId } : {}),
        },
    });

    if (!entity) {
        throw new NotFoundError();
    }

    if (!entity.encryption_key) {
        throw new BadRequestError('The encryption key does not exist');
    }

    const container = await AsymmetricKey
        .fromBase64({
            format: 'spki',
            key: entity.encryption_key,
            options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signature_algorithm),
        });

    const jsonWebKey = await container.toJWK();
    jsonWebKey.alg = entity.signature_algorithm;

    return {
        ...jsonWebKey,
        kid: entity.id,
    } as OAuth2JsonWebKey;
}
