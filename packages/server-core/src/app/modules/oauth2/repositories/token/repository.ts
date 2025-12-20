/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CacheSetOptions, ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind, OAuth2TokenKind } from '@authup/specs';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity } from '../../../../../adapters/database/domains';
import type { IOAuth2TokenRepository } from '../../../../../core';
import { CacheOAuth2Prefix } from '../constants';

export class OAuth2TokenRepository implements IOAuth2TokenRepository {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    // -----------------------------------------------------

    async findOneBySignature(signature: string): Promise<OAuth2TokenPayload | null> {
        return this.cache.get(
            buildCacheKey({ prefix: CacheOAuth2Prefix.TOKEN_CLAIMS, key: signature }),
        );
    }

    async findOneById(id: string): Promise<OAuth2TokenPayload | null> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

        const entity = await repository.findOne({
            where: {
                id,
            },
            relations: ['realm'],
        });

        if (!entity) {
            return null;
        }

        const payload : OAuth2TokenPayload = {
            exp: new Date(entity.expires).getTime(),
            sub: this.getSubject(entity),
            sub_kind: this.getSubjectKind(entity),
            realm_id: entity.realm.id,
            realm_nam: entity.realm.name,
        };
        if (entity.scope) {
            payload.scope = entity.scope;
        }

        if (entity.client_id) {
            payload.client_id = entity.client_id;
        }

        return payload;
    }

    // -----------------------------------------------------

    async removeById(id: string): Promise<void> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

        const entity = await repository.findOneBy({
            id,
        });

        if (entity) {
            await repository.remove(entity);
        }
    }

    // -----------------------------------------------------

    async insert(payload: OAuth2TokenPayload): Promise<OAuth2TokenPayload> {
        if (payload.kind !== OAuth2TokenKind.REFRESH) {
            return payload;
        }

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

        const entity = repository.create({
            client_id: payload.client_id,
            expires: new Date(
                payload.exp ?
                    (payload.exp * 1_000) :
                    Date.now() + (1_000 * 3_600),
            ).toISOString(),
            scope: payload.scope,
            // access_token: payload.jti,
            realm_id: payload.realm_id,
            ...(payload.sub_kind === OAuth2SubKind.CLIENT ? { client_id: payload.sub } : {}),
            ...(payload.sub_kind === OAuth2SubKind.USER ? { user_id: payload.sub } : {}),
            ...(payload.sub_kind === OAuth2SubKind.ROBOT ? { robot_id: payload.sub } : {}),
        });

        await repository.insert(entity);

        return {
            ...payload,
            jti: entity.id,
        };
    }

    async save(payload: OAuth2TokenPayload): Promise<OAuth2TokenPayload> {
        // we don't update tokens
        if (payload.kind !== OAuth2TokenKind.REFRESH || payload.jti) {
            return payload;
        }

        return this.insert(payload);
    }

    async saveWithSignature(data: OAuth2TokenPayload, signature: string): Promise<OAuth2TokenPayload> {
        const options : CacheSetOptions = {
            ttl: this.buildTTL(data.exp),
        };

        const normalized = await this.save(data);

        await this.cache.set(
            buildCacheKey({ prefix: CacheOAuth2Prefix.TOKEN_CLAIMS, key: signature }),
            normalized,
            options,
        );

        return normalized;
    }

    // -----------------------------------------------------

    async isInactive(key: string): Promise<boolean> {
        const cacheKey = buildCacheKey({
            prefix: CacheOAuth2Prefix.TOKEN_INACTIVE,
            key,
        });

        const response = await this.cache.get(cacheKey);

        return !!response;
    }

    async setInactive(key: string, exp?: number): Promise<void> {
        const ttl = this.buildTTL(exp);

        const cacheKey = buildCacheKey({
            prefix: CacheOAuth2Prefix.TOKEN_INACTIVE,
            key,
        });

        await this.cache.set(
            cacheKey,
            true,
            {
                ttl,
            },
        );
    }

    // -----------------------------------------------------

    /**
     * Transform timestamp in seconds to ttl in ms.
     *
     * @param utc
     * @protected
     */
    protected buildTTL(utc?: number) {
        if (typeof utc === 'number') {
            const ttl = (utc * 1000) - Date.now();
            if (ttl > 0) {
                return ttl;
            }
        }

        return 3_600 * 1000;
    }

    protected getSubject(entity: OAuth2RefreshTokenEntity) {
        if (entity.robot_id) {
            return entity.robot_id;
        }

        if (entity.user_id) {
            return entity.user_id;
        }

        if (entity.client_id) {
            return entity.client_id;
        }

        throw new SyntaxError('The subject could not be extracted from token entity.');
    }

    protected getSubjectKind(entity: OAuth2RefreshTokenEntity) : OAuth2SubKind {
        if (entity.robot_id) {
            return OAuth2SubKind.ROBOT;
        }

        if (entity.user_id) {
            return OAuth2SubKind.USER;
        }

        if (entity.client_id) {
            return OAuth2SubKind.CLIENT;
        }

        throw new SyntaxError('The subject kind could not be extracted from the token entity.');
    }
}
