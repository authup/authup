/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    KeyType, Realm,
    unwrapPrivateKeyPem,
    unwrapPublicKeyPem,
} from '@authelion/common';
import {
    createKeyPair,
} from '@authelion/server-common';
import { FindOptionsWhere } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity } from '../entity';

export async function useKey(
    where: FindOptionsWhere<KeyEntity> & { realm_id: Realm['id']},
) : Promise<KeyEntity> {
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
        cache: 60.000,
    });

    if (!entity) {
        const keyPair = await createKeyPair({
            type: 'rsa',
        });

        entity = repository.create({
            type: KeyType.RSA,
            decryption_key: unwrapPrivateKeyPem(keyPair.privateKey),
            encryption_key: unwrapPublicKeyPem(keyPair.publicKey),
            realm_id: where.realm_id,
            signature_algorithm: 'RS256',
        });

        await repository.save(entity);
    } else {
        entity.decryption_key = unwrapPrivateKeyPem(entity.decryption_key);
        entity.encryption_key = unwrapPublicKeyPem(entity.encryption_key);

        await repository.save(entity);
    }

    return entity;
}
