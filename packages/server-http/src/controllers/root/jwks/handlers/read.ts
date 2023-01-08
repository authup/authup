/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JsonWebKey, createPublicKey } from 'crypto';
import {
    Request, Response, send, useRequestParam,
} from 'routup';
import { In } from 'typeorm';
import { KeyType, wrapPublicKeyPem } from '@authup/common';
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity } from '@authup/server-database';

export async function getJwksRouteHandler(req: Request, res: Response) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(KeyEntity);

    const entities = await repository.find({
        where: {
            type: In([KeyType.RSA, KeyType.EC]),
        },
        order: {
            priority: 'DESC',
        },
    });

    const keys : JsonWebKey[] = entities.map((entity) => {
        const keyObject = createPublicKey({
            key: wrapPublicKeyPem(entity.encryption_key),
            format: 'pem',
            type: 'pkcs1',
        });

        const jwk = keyObject.export({
            format: 'jwk',
        });

        return { ...jwk, alg: entity.signature_algorithm, kid: entity.id };
    });

    return send(res, {
        keys,
    });
}

export async function getJwkRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(KeyEntity);

    const entity = await repository.findOne({
        where: {
            type: In([KeyType.RSA, KeyType.EC]),
            id,
        },
    });

    if (!entity) {
        throw new NotFoundError();
    }

    const keyObject = createPublicKey({
        key: wrapPublicKeyPem(entity.encryption_key),
        format: 'pem',
        type: 'pkcs1',
    });

    let jwk = keyObject.export({
        format: 'jwk',
    });

    jwk = { ...jwk, alg: entity.signature_algorithm, kid: entity.id };

    return send(res, jwk);
}
