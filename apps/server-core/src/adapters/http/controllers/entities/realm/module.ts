/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { OAuth2JsonWebKey, OpenIDProviderMetadata } from '@authup/specs';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { Repository } from 'typeorm';
import type { IRealmService } from '../../../../../core/index.ts';
import type { KeyEntity } from '../../../../database/domains/index.ts';
import { getJwkRouteHandler, getJwksRouteHandler } from '../../workflows/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
} from '../../../request/index.ts';

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
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const { data, meta } = await this.service.getMany(useRequestQuery(req));

        return send(res, { data, meta });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ) : Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.create(data, actor);

        return sendCreated(res, entity);
    }

    @DGet('/:id', [])
    async get(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const entity = await this.service.getOne(
            id,
        );

        return send(res, entity);
    }

    @DGet('/:id/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(
        @DPath('id') id: string,
    ): Promise<OpenIDProviderMetadata> {
        const entity = await this.service.getOne(id);

        return {
            issuer: this.options.baseURL,

            authorization_endpoint: new URL('authorize', this.options.baseURL).href,

            jwks_uri: new URL(`realms/${entity.id}/jwks`, this.options.baseURL).href,

            response_types_supported: [
                OAuth2AuthorizationResponseType.CODE,
                OAuth2AuthorizationResponseType.TOKEN,
                OAuth2AuthorizationResponseType.NONE,
            ],

            subject_types_supported: [
                'public',
            ],

            id_token_signing_alg_values_supported: [
                'HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'none',
            ],

            token_endpoint: new URL('token', this.options.baseURL).href,

            introspection_endpoint: new URL('token/introspect', this.options.baseURL).href,

            revocation_endpoint: new URL('token', this.options.baseURL).href,

            // -----------------------------------------------------------

            service_documentation: 'https://authup.org/',

            userinfo_endpoint: new URL('users/@me', this.options.baseURL).href,
        };
    }

    @DGet('/:id/jwks', [])
    async getCerts(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<OAuth2JsonWebKey[]> {
        return getJwksRouteHandler(req, res, this.keyRepository, 'id');
    }

    @DGet('/:id/jwks/:keyId', [])
    async getCert(
        @DPath('id') id: string,
        @DPath('keyId') keyId: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<OAuth2JsonWebKey> {
        return getJwkRouteHandler(req, res, this.keyRepository, 'keyId');
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ) : Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.update(
            id,
            data,
            actor,
        );

        return sendAccepted(res, entity);
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ) : Promise<any> {
        const actor = buildActorContext(req);
        const { entity, created } = await this.service.save(
            id || undefined,
            data,
            actor,
        );

        if (created) {
            return sendCreated(res, entity);
        }

        return sendAccepted(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ) : Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(id, actor);

        return sendAccepted(res, entity);
    }
}
