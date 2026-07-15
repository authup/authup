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
import { buildX5c, buildX5tS256, parseCertificateChain } from '../../../../../../core/index.ts';

async function buildCertificateJwkFields(
    certificate: string | null,
): Promise<Partial<Pick<OAuth2JsonWebKey, 'x5c' | 'x5t#S256'>>> {
    if (!certificate) {
        return {};
    }

    try {
        const chain = parseCertificateChain(certificate);
        return {
            x5c: buildX5c(chain),
            'x5t#S256': await buildX5tS256(chain),
        };
    } catch {
        // One malformed legacy/database row must not take down the realm's
        // whole JWKS. Publish the usable public key without certificate data.
        return {};
    }
}

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
            ...(realmId ? { realm_id: realmId } : {}),
        },
        order: { priority: 'DESC' },
    });

    const promises = entities
        .filter(
            (entity): entity is KeyEntity & { encryption_key: string, signature_algorithm: `${JWTAlgorithm}` } => !!entity.encryption_key &&
                !!entity.signature_algorithm,
        )
        .map(
            (entity) => AsymmetricKey
                .fromBase64({
                    format: 'spki',
                    key: entity.encryption_key,
                    options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signature_algorithm),
                })
                .then((container) => container.toJWK())
                .then(async (key) => {
                    const certificateFields = await buildCertificateJwkFields(entity.certificate);

                    return {
                        ...key,
                        kid: entity.id,
                        alg: entity.signature_algorithm,
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
            ...(realmId ? { realm_id: realmId } : {}),
        },
    });

    if (!entity) {
        throw JWKError.notFound(keyId);
    }

    if (!entity.encryption_key || !entity.signature_algorithm) {
        throw JWKError.encryptionKeyMissing();
    }

    const container = await AsymmetricKey
        .fromBase64({
            format: 'spki',
            key: entity.encryption_key,
            options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signature_algorithm),
        });

    const jsonWebKey = await container.toJWK();
    const certificateFields = await buildCertificateJwkFields(entity.certificate);

    return {
        ...jsonWebKey,
        kid: entity.id,
        alg: entity.signature_algorithm,
        ...certificateFields,
    };
}
