/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AsymmetricKey } from '@authup/server-kit';
import { JWKType } from '@authup/specs';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { In } from 'typeorm';
import { BadRequestError, NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity } from '../../../../../database/domains/index.ts';
import { getRequestStringParam, getRequestStringParamOrFail } from '../../../../request/index.ts';

export async function getJwksRouteHandler(
    req: Request,
    res: Response,
    realmIdParamKey?: string,
) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(KeyEntity);

    const realmId = getRequestStringParam(req, realmIdParamKey || 'realmId');

    const entities = await repository.find({
        where: {
            type: In([JWKType.RSA, JWKType.EC]),
            ...(realmId ? { realm_id: realmId } : {}),
        },
        order: {
            priority: 'DESC',
        },
    });

    const promises = entities
        .filter((entity) => !!entity.encryption_key)
        .map(
            (entity) => AsymmetricKey
                .fromBase64({
                    format: 'spki',
                    key: entity.encryption_key!,
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

    return send(res, {
        keys,
    });
}

export async function getJwkRouteHandler(
    req: Request,
    res: Response,
    idParamKey?: string,
) : Promise<any> {
    const id = getRequestStringParamOrFail(req, idParamKey || 'id');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(KeyEntity);

    const entity = await repository.findOne({
        where: {
            type: In([JWKType.RSA, JWKType.EC]),
            id,
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
            key: entity.encryption_key!,
            options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signature_algorithm),
        });

    const jsonWebKey = await container.toJWK();
    jsonWebKey.alg = entity.signature_algorithm;

    return send(res, {
        ...jsonWebKey,
        kid: entity.id,
    });
}
