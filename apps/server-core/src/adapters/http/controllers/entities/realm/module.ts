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
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { isPropertySet, isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName, REALM_MASTER_NAME, RealmValidator,
} from '@authup/core-kit';
import type { Realm } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { Repository } from 'typeorm';
import type { IRealmRepository } from '../../../../../core/index.ts';
import type { KeyEntity } from '../../../../database/domains/index.ts';
import { getJwkRouteHandler, getJwksRouteHandler } from '../../workflows/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    RequestHandlerOperation, getRequestParamID, useRequestParamID, useRequestPermissionChecker,
} from '../../../request/index.ts';

export type RealmControllerOptions = {
    baseURL: string
};

export type RealmControllerContext = {
    options: RealmControllerOptions,
    repository: IRealmRepository,
    keyRepository: Repository<KeyEntity>,
};

@DTags('realm')
@DController('/realms')
export class RealmController {
    protected options: RealmControllerOptions;

    protected repository: IRealmRepository;

    protected keyRepository: Repository<KeyEntity>;

    constructor(ctx: RealmControllerContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
        this.keyRepository = ctx.keyRepository;
    }

    @DGet('', [])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const { data, meta } = await this.repository.findMany(useRequestQuery(req));

        return send(res, {
            data,
            meta,
        });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<Realm>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<any> {
        return this.write(req, res, {
            updateOnly: true,
        });
    }

    @DGet('/:id', [])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const paramId = useRequestParamID(req, {
            isUUID: false,
        });

        const entity = await this.repository.findOneByIdOrName(paramId);

        if (!entity) {
            throw new NotFoundError();
        }

        return send(res, entity);
    }

    @DGet('/:id/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(
        @DPath('id') id: string,
    ): Promise<OpenIDProviderMetadata> {
        const entity = await this.repository.findOneBy({ id });

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
            @DBody() user: NonNullable<Realm>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<any> {
        return this.write(req, res, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() user: NonNullable<Realm>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<any> {
        return this.write(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<any> {
        const paramId = useRequestParamID(req);

        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.REALM_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        if (entity.built_in) {
            throw new BadRequestError('A built-in realm can not be deleted.');
        }

        await permissionChecker.check({
            name: PermissionName.REALM_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);

        entity.id = entityId;

        return sendAccepted(res, entity);
    }

    // ------------------------------------------------------------------

    private async write(req: Request, res: Response, options: {
        updateOnly?: boolean
    } = {}): Promise<any> {
        let group: string;
        const id = getRequestParamID(req, { isUUID: false });

        let entity: Realm | null | undefined;
        if (id) {
            const where: Record<string, any> = {};
            if (isUUID(id)) {
                where.id = id;
            } else {
                where.name = id;
            }

            entity = await this.repository.findOneBy(where);
            if (!entity && options.updateOnly) {
                throw new NotFoundError();
            }
        }

        const permissionChecker = useRequestPermissionChecker(req);
        if (entity) {
            await permissionChecker.preCheck({ name: PermissionName.REALM_UPDATE });

            group = RequestHandlerOperation.UPDATE;
        } else {
            await permissionChecker.preCheck({ name: PermissionName.REALM_CREATE });

            group = RequestHandlerOperation.CREATE;
        }

        const validator = new RealmValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group,
        });

        await this.repository.validateJoinColumns(data);

        if (entity) {
            await permissionChecker.check({
                name: PermissionName.REALM_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...data,
                    },
                }),
            });

            if (entity.name === REALM_MASTER_NAME && isPropertySet(data, 'name') && entity.name !== data.name) {
                throw new BadRequestError(`The name of the ${REALM_MASTER_NAME} can not be changed.`);
            }
        } else {
            await permissionChecker.check({
                name: PermissionName.REALM_CREATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: data,
                }),
            });
        }

        // ----------------------------------------------

        if (entity) {
            entity = this.repository.merge(entity, data);
            await this.repository.save(entity);

            return sendAccepted(res, entity);
        }

        entity = this.repository.create(data);
        await this.repository.save(entity);

        return sendCreated(res, entity);
    }
}
