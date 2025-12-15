/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { OAuth2AuthorizationResponseType, OAuth2JsonWebKey, OpenIDProviderMetadata } from '@authup/specs';
import type { Realm } from '@authup/core-kit';
import { useDataSource } from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { getJwkRouteHandler, getJwksRouteHandler } from '../../workflows';
import {
    deleteRealmRouteHandler,
    getManyRealmRouteHandler,
    getOneRealmRouteHandler,
    writeRealmRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../../middleware';
import { RealmEntity } from '../../../../database/domains';

export type RealmControllerOptions = {
    baseURL: string
};

export type RealmControllerContext = {
    options: RealmControllerOptions
};
@DTags('realm')
@DController('/realms')
export class RealmController {
    protected options: RealmControllerOptions;

    constructor(ctx: RealmControllerContext) {
        this.options = ctx.options;
    }

    @DGet('', [])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Realm[]> {
        return getManyRealmRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<Realm>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Realm> {
        return writeRealmRouteHandler(req, res, {
            updateOnly: true,
        });
    }

    @DGet('/:id', [])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Realm> {
        return getOneRealmRouteHandler(req, res);
    }

    @DGet('/:id/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(
        @DPath('id') id: string,
    ): Promise<OpenIDProviderMetadata> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(RealmEntity);

        const entity = await repository.findOneBy({ id });

        if (!entity) {
            throw new NotFoundError();
        }

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
        return getJwksRouteHandler(req, res, 'id');
    }

    @DGet('/:id/jwks/:keyId', [])
    async getCert(
        @DPath('id') id: string,
            @DPath('keyId') keyId: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OAuth2JsonWebKey> {
        return getJwkRouteHandler(req, res, 'keyId');
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() user: NonNullable<Realm>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Realm> {
        return writeRealmRouteHandler(req, res, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() user: NonNullable<Realm>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Realm> {
        return writeRealmRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Realm> {
        return deleteRealmRouteHandler(req, res);
    }
}
