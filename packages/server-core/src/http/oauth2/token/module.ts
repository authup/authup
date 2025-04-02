/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    JWKError, JWKType, JWTAlgorithm, JWTError, OAuth2Error,
} from '@authup/specs';
import type { OAuth2TokenPayload } from '@authup/specs';
import type {
    Cache,
    CacheSetOptions,
    TokenECAlgorithm,
    TokenRSAAlgorithm,
} from '@authup/server-kit';
import {
    CryptoAsymmetricAlgorithm,
    CryptoKeyContainer,
    buildCacheKey,
    createAsymmetricKeyPair,
    extractTokenHeader,
    signToken,
    useCache,
    verifyToken,
} from '@authup/server-kit';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity } from '../../../database/domains';
import { OAuth2CachePrefix } from '../constants';

type OAuth2TokenManagerVerifyOptions = {
    skipActiveCheck?: boolean,
};

type OAuth2TokenManagerSingResult<T> = {
    payload: T,
    token: string
};

export class OAuth2TokenManager {
    protected cache : Cache;

    constructor() {
        this.cache = useCache();
    }

    // -----------------------------------------------------

    /**
     * @throws JWTError
     * @throws JWKError
     *
     * @param token
     * @param options
     */
    async verify(
        token: string,
        options: OAuth2TokenManagerVerifyOptions = {},
    ) {
        if (!token) {
            throw JWTError.invalid();
        }

        if (!options.skipActiveCheck) {
            const isActive = await this.isActive(token);
            if (!isActive) {
                throw JWTError.notActive();
            }
        }

        let payload = await this.getPayloadFromCache(token);
        if (payload) {
            return payload;
        }

        const header = extractTokenHeader(token);
        if (!header.kid) {
            throw JWTError.headerPropertyInvalid('kid');
        }

        const entity = await this.useKey({
            id: header.kid,
        });
        if (!entity) {
            throw JWKError.notFound(header.kid);
        }

        if (entity.type === JWKType.OCT) {
            payload = await verifyToken(
                token,
                {
                    type: JWKType.OCT,
                    key: entity.decryption_key,
                },
            );
        } else if (entity.type === JWKType.EC) {
            payload = await verifyToken(
                token,
                {
                    type: entity.type,
                    key: entity.encryption_key,
                    ...(
                        entity.signature_algorithm ?
                            { algorithms: [entity.signature_algorithm] } :
                            []
                    ) as TokenECAlgorithm[],
                },
            );
        } else {
            payload = await verifyToken(
                token,
                {
                    type: entity.type,
                    key: entity.encryption_key,
                    ...(
                        entity.signature_algorithm ?
                            { algorithms: [entity.signature_algorithm] } :
                            []
                    ) as TokenRSAAlgorithm[],
                },
            );
        }

        await this.addPayloadToCache(token, payload);

        return payload;
    }

    async sign<T extends OAuth2TokenPayload>(
        payload: T,
    ) : Promise<OAuth2TokenManagerSingResult<T>> {
        const key = await this.useKey({
            realm_id: payload.realm_id,
        });

        if (!key) {
            throw JWKError.notFoundForRealm(payload.realm_id, payload.realm_name);
        }

        if (!payload.exp) {
            payload.exp = Math.floor(new Date().getTime() / 1000) + 3600;
        }

        let token : string;
        if (key.type === JWKType.OCT) {
            token = await signToken(
                payload,
                {
                    type: JWKType.OCT,
                    key: key.decryption_key,
                    keyId: key.id,
                },
            );
        } else if (key.type === JWKType.EC) {
            token = await signToken(
                payload,
                {
                    type: key.type,
                    key: key.decryption_key,
                    algorithm: key.signature_algorithm as TokenECAlgorithm,
                    keyId: key.id,
                },
            );
        } else {
            token = await signToken(
                payload,
                {
                    type: key.type,
                    key: key.decryption_key,
                    algorithm: key.signature_algorithm as TokenRSAAlgorithm,
                    keyId: key.id,
                },
            );
        }

        await this.addPayloadToCache(token, payload);

        return {
            payload,
            token,
        };
    }

    async useKey(where: FindOptionsWhere<KeyEntity>) {
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

    // -----------------------------------------------------

    async setInactive(token: string, options: CacheSetOptions = {}) {
        if (!options.ttl) {
            const payload = await this.getPayloadFromCache(token);
            if (payload) {
                options.ttl = this.transformUnixTimestampToTTL(payload.exp);
            }

            options.ttl = options.ttl || 3_600;
        }

        await this.cache.set(
            buildCacheKey({
                prefix: OAuth2CachePrefix.TOKEN_INACTIVE,
                key: token,
            }),
            true,
            options,
        );
    }

    async isActive(token: string) : Promise<boolean> {
        const response = await this.cache.get(
            buildCacheKey({
                prefix: OAuth2CachePrefix.TOKEN_INACTIVE,
                key: token,
            }),
        );

        return !response;
    }

    // -----------------------------------------------------

    /**
     * Cache token payload by JTI.
     *
     * @param token
     * @param data
     */
    protected async addPayloadToCache(
        token: string,
        data: OAuth2TokenPayload,
    ): Promise<void> {
        const options : CacheSetOptions = {
            ttl: this.transformUnixTimestampToTTL(data.exp),
        };

        await this.cache.set(
            buildCacheKey({ prefix: OAuth2CachePrefix.TOKEN_CLAIMS, key: token }),
            data,
            options,
        );
    }

    /**
     * Get token payload by jwt
     *
     * @param jwt
     */
    protected async getPayloadFromCache(
        jwt: string,
    ) : Promise<OAuth2TokenPayload | undefined> {
        return this.cache.get(
            buildCacheKey({ prefix: OAuth2CachePrefix.TOKEN_CLAIMS, key: jwt }),
        );
    }

    // -----------------------------------------------------

    /**
     * Transform exp claim to time to live.
     * @param exp
     */
    protected transformUnixTimestampToTTL(exp: number) {
        const ttl = (exp * 1000) - Date.now();

        return ttl > 0 ? ttl : 0;
    }
}
