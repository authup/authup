/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Cache, CacheSetOptions } from '@authup/server-kit';
import { buildCacheKey, useCache } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind, OAuth2TokenKind } from '@authup/specs';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity } from '../../../domains';
import { CacheOAuth2Prefix } from '../../../../index';
import type { IOAuth2TokenRepository } from '../../../../../core';

export class OAuth2TokenRepository implements IOAuth2TokenRepository {
    protected cache : Cache;

    constructor() {
        this.cache = useCache();
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

        return {
            scope: entity.scope,
            client_id: entity.client_id,
            exp: new Date(entity.expires).getTime(),
            sub: this.getSubject(entity),
            sub_kind: this.getSubjectKind(entity),
            realm_id: entity.realm.id,
            realm_nam: entity.realm.name,
        };
    }

    // -----------------------------------------------------

    async remove(id: string): Promise<void> {
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

    async save(payload: OAuth2TokenPayload): Promise<OAuth2TokenPayload> {
        if (payload.kind !== OAuth2TokenKind.REFRESH) {
            return payload;
        }

        if (payload.jti) {
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
            access_token: payload.jti,
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

    async saveWithSignature(data: OAuth2TokenPayload, signature: string): Promise<OAuth2TokenPayload> {
        const options : CacheSetOptions = {
            ttl: this.transformUnixTimestampToTTL(data.exp),
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

    async isActive(key: string): Promise<boolean> {
        const cacheKey = buildCacheKey({
            prefix: CacheOAuth2Prefix.TOKEN_INACTIVE,
            key,
        });

        const response = await this.cache.get(cacheKey);

        return !response;
    }

    async setInactive(id: string, exp?: number): Promise<void> {
        let ttl : number;
        if (exp) {
            ttl = this.transformUnixTimestampToTTL(exp);
        } else {
            ttl = 1_000 * 3_600;
        }

        const cacheKey = buildCacheKey({
            prefix: CacheOAuth2Prefix.TOKEN_INACTIVE,
            key: id,
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
     * Transform exp claim to time to live.
     * @param exp
     */
    protected transformUnixTimestampToTTL(exp: number) {
        const ttl = (exp * 1000) - Date.now();

        return ttl > 0 ? ttl : 0;
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
