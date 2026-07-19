/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyStatus } from '@authup/core-kit';
import { AsymmetricKey } from '@authup/server-kit';
import type { JWTAlgorithm, OAuth2JsonWebKey } from '@authup/specs';
import { JWKError, JWKType, JWKUse } from '@authup/specs';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import type { KeyEntity } from '../../../../../database/domains/index.ts';
import { buildCertificateJwkFields } from '../../../../../../core/index.ts';

export async function getJwksRouteHandler(
    repository: Repository<KeyEntity>,
    realmId?: string,
) : Promise<{ keys: OAuth2JsonWebKey[] }> {
    const entities = await repository.find({
        where: {
            type: In([JWKType.RSA, JWKType.EC]),
            use: JWKUse.SIGNATURE,
            // active + passive verify; disabled keys never publish.
            status: In([KeyStatus.ACTIVE, KeyStatus.PASSIVE]),
            ...(realmId ? { realmId } : {}),
        },
        order: { priority: 'DESC' },
    });

    const promises = entities
        .filter(
            (entity): entity is KeyEntity & { encryptionKey: string, signatureAlgorithm: `${JWTAlgorithm}` } => !!entity.encryptionKey &&
                !!entity.signatureAlgorithm,
        )
        .map(
            (entity) => AsymmetricKey
                .fromBase64({
                    format: 'spki',
                    key: entity.encryptionKey,
                    options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signatureAlgorithm),
                })
                .then((container) => container.toJWK())
                .then(async (key) => {
                    const certificateFields = await buildCertificateJwkFields(entity.certificate);

                    return {
                        ...key,
                        kid: entity.id,
                        alg: entity.signatureAlgorithm,
                        ...certificateFields,
                    };
                }),
        );

    const keys = await Promise.all(promises);

    return { keys };
}

export async function getJwkRouteHandler(
    repository: Repository<KeyEntity>,
    keyId: string,
    realmId?: string,
) : Promise<OAuth2JsonWebKey> {
    const entity = await repository.findOne({
        where: {
            type: In([JWKType.RSA, JWKType.EC]),
            use: JWKUse.SIGNATURE,
            status: In([KeyStatus.ACTIVE, KeyStatus.PASSIVE]),
            id: keyId,
            ...(realmId ? { realmId } : {}),
        },
    });

    if (!entity) {
        throw JWKError.notFound(keyId);
    }

    if (!entity.encryptionKey || !entity.signatureAlgorithm) {
        throw JWKError.encryptionKeyMissing();
    }

    const container = await AsymmetricKey
        .fromBase64({
            format: 'spki',
            key: entity.encryptionKey,
            options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signatureAlgorithm),
        });

    const jsonWebKey = await container.toJWK();
    const certificateFields = await buildCertificateJwkFields(entity.certificate);

    return {
        ...jsonWebKey,
        kid: entity.id,
        alg: entity.signatureAlgorithm,
        ...certificateFields,
    };
}
