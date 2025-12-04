/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import { CryptoAsymmetricAlgorithm, CryptoKeyContainer, createAsymmetricKeyPair } from '@authup/server-kit';
import { JWKType, JWTAlgorithm } from '@authup/specs';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity } from '../../../domains';
import type { IOAuth2KeyRepository } from '../../../../../core/oauth2/key';

export class OAuth2KeyRepository implements IOAuth2KeyRepository {
    async findByRealmId(realmId: string): Promise<Key | null> {
        return this.createOrGet({
            realm_id: realmId,
        });
    }

    async findById(id: string): Promise<Key | null> {
        return this.createOrGet({
            id,
        });
    }

    protected async createOrGet(where: { realm_id?: string, id?: string }) : Promise<Key | null> {
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
            return null;
        }

        const keyPair = await createAsymmetricKeyPair({
            name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
        });

        const privateKeyContainer = new CryptoKeyContainer(keyPair.privateKey);
        const publicKeyContainer = new CryptoKeyContainer(keyPair.publicKey);

        entity = repository.create({
            type: JWKType.RSA,
            decryption_key: await privateKeyContainer.toBase64(),
            encryption_key: await publicKeyContainer.toBase64(),
            realm_id: where.realm_id,
            signature_algorithm: `${JWTAlgorithm.RS256}`,
        });

        await repository.save(entity);

        return entity;
    }
}
