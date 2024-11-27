/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    createKeyPair,
    unwrapPrivateKeyPem,

    unwrapPublicKeyPem,
} from '@authup/server-kit';
import { JWKType } from '@authup/schema';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity } from '../entity';

export async function useKey(
    where: FindOptionsWhere<KeyEntity>,
) : Promise<KeyEntity | undefined> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(KeyEntity);

    let entity = await repository.findOne({
        select: {
            id: true,
            type: true,
            signature_algorithm: true,
            encryption_key: true,
            decryption_key: true,
        },
        where,
    });

    if (entity) {
        return entity;
    }

    if (typeof where.realm_id !== 'string') {
        return undefined;
    }

    const keyPair = await createKeyPair({
        type: 'rsa',
    });

    entity = repository.create({
        type: JWKType.RSA,
        decryption_key: unwrapPrivateKeyPem(keyPair.privateKey),
        encryption_key: unwrapPublicKeyPem(keyPair.publicKey),
        realm_id: where.realm_id,
        signature_algorithm: 'RS256',
    });

    await repository.save(entity);

    return entity;
}
