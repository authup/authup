/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useKeyPair } from '@authelion/server-utils';
import { JsonWebKey, createPublicKey } from 'crypto';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { useConfig } from '../../../../config';
import { useDataSource } from '../../../../database';
import { RealmEntity } from '../../../../domains';

export async function getRealmCertsRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const config = await useConfig();
    const keyPair = await useKeyPair({
        privateName: entity.id,
        publicName: entity.id,
        directory: config.writableDirectoryPath,
    });

    const keyObject = createPublicKey({
        key: keyPair.publicKey,
        format: 'pem',
        type: 'pkcs1',
    });

    const jwk = keyObject.export({
        format: 'jwk',
    });

    const keys : JsonWebKey[] = [
        { ...jwk, alg: 'RS256', kid: entity.id },
    ];

    return res.respond({
        data: {
            keys,
        },
    });
}
