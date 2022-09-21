/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JsonWebKey, createPublicKey } from 'crypto';
import { In } from 'typeorm';
import { KeyType, wrapPublicKeyPem } from '@authelion/common';
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { KeyEntity } from '../../../../../domains';

export async function getJwksRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

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

    return res.respond({
        data: {
            keys,
        },
    });
}

export async function getJwkRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

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

    return res.respond({
        data: jwk,
    });
}
