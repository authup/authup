/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWKType } from '@authup/schema';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { In } from 'typeorm';
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity } from '../../../../../database/domains';
import { transformBase64KeyToJsonWebKey } from '../../../../../domains';
import { getRequestStringParam, getRequestStringParamOrFail } from '../../../../request';

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

    const promises = entities.map(
        (entity) => transformBase64KeyToJsonWebKey(
            'spki',
            entity.encryption_key,
            entity.signature_algorithm,
        )
            .then((key) => ({
                ...key,
                kid: entity.id,
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

    const jsonWebKey = await transformBase64KeyToJsonWebKey(
        'spki',
        entity.encryption_key,
        entity.signature_algorithm,
    );

    return send(res, {
        ...jsonWebKey,
        kid: entity.id,
    });
}
