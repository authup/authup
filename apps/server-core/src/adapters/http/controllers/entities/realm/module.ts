/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody,
    DContext,
    DController,
    DDelete,
    DGet,
    DPath,
    DPost,
    DPut,
    DTags,
} from '@routup/decorators';
import type { OAuth2JsonWebKey, OpenIDProviderMetadata } from '@authup/specs';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import type { IRoutupEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { Repository } from 'typeorm';
import type { IRealmService } from '../../../../../core/index.ts';
import { resolveURL } from '../../../../../utils/index.ts';
import type { KeyEntity } from '../../../../database/domains/index.ts';
import { getJwkRouteHandler, getJwksRouteHandler } from '../../workflows/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type RealmControllerOptions = {
    baseURL: string
};

export type RealmControllerContext = {
    options: RealmControllerOptions,
    service: IRealmService,
    keyRepository: Repository<KeyEntity>,
};

@DTags('realm')
@DController('/realms')
export class RealmController {
    protected options: RealmControllerOptions;

    protected service: IRealmService;

    protected keyRepository: Repository<KeyEntity>;

    constructor(ctx: RealmControllerContext) {
        this.options = ctx.options;
        this.service = ctx.service;
        this.keyRepository = ctx.keyRepository;
    }

    @DGet('', [])
    async getMany(
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const {
            data, 
            meta, 
        } = await this.service.getMany(useRequestQuery(event));

        return {
            data,
            meta, 
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ) : Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }

    @DGet('/:id', [])
    async get(@DPath('id') id: string): Promise<any> {
        return this.service.getOne(id);
    }

    @DGet('/:id/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(
        @DPath('id') id: string,
    ): Promise<OpenIDProviderMetadata> {
        const entity = await this.service.getOne(id);

        const { baseURL } = this.options;

        return {
            issuer: resolveURL(baseURL, `realms/${entity.name}`).replace(/\/+$/, ''),

            authorization_endpoint: resolveURL(baseURL, 'authorize'),

            jwks_uri: resolveURL(baseURL, `realms/${entity.name}/jwks`),

            response_types_supported: [
                OAuth2AuthorizationResponseType.CODE,
                OAuth2AuthorizationResponseType.TOKEN,
                OAuth2AuthorizationResponseType.NONE,
            ],

            subject_types_supported: [
                'public',
            ],

            id_token_signing_alg_values_supported: [
                'HS256',
                'HS384',
                'HS512',
                'RS256',
                'RS384',
                'RS512',
                'none',
            ],

            token_endpoint: resolveURL(baseURL, 'token'),

            introspection_endpoint: resolveURL(baseURL, 'token/introspect'),

            revocation_endpoint: resolveURL(baseURL, 'token'),

            // -----------------------------------------------------------

            service_documentation: 'https://authup.org/',

            userinfo_endpoint: resolveURL(baseURL, 'users/@me'),
        };
    }

    @DGet('/:id/jwks', [])
    async getCerts(@DPath('id') id: string): Promise<OAuth2JsonWebKey[]> {
        const entity = await this.service.getOne(id);
        return getJwksRouteHandler(this.keyRepository, entity.id);
    }

    @DGet('/:id/jwks/:keyId', [])
    async getCert(
        @DPath('id') id: string,
        @DPath('keyId') keyId: string,
    ): Promise<OAuth2JsonWebKey> {
        const entity = await this.service.getOne(id);
        return getJwkRouteHandler(this.keyRepository, keyId, entity.id);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ) : Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(
            id,
            data,
            actor,
        );

        event.response.status = 202;

        return entity;
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ) : Promise<any> {
        const actor = buildActorContext(event);
        const {
            entity, 
            created, 
        } = await this.service.save(
            id || undefined,
            data,
            actor,
        );

        event.response.status = created ? 201 : 202;
        return entity;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ) : Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return entity;
    }
}
