/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2SubKind } from '@authup/specs';
import {
    DBody, 
    DController, 
    DDelete, 
    DGet, 
    DPath, 
    DPost, 
    DPut, 
    DRequest, 
    DResponse, 
    DTags,
} from '@routup/decorators';
import { NotFoundError } from '@ebec/http';
import type { Client } from '@authup/core-kit';
import {
    send, 
    sendAccepted, 
    sendCreated, 
    useRequestParam,
} from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { IClientRepository, IClientService } from '../../../../../core/index.ts';
import { OAuth2ScopeAttributesResolver } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { isSelfToken } from '../../../../../utils/index.ts';
import {
    buildActorContext,
    useRequestIdentity,
    useRequestScopes,
} from '../../../request/index.ts';

export type ClientControllerContext = {
    service: IClientService,
    repository: IClientRepository,
};

@DTags('oauth2')
@DController('/clients')
export class ClientController {
    protected service: IClientService;

    protected repository: IClientRepository;

    constructor(ctx: ClientControllerContext) {
        this.service = ctx.service;
        this.repository = ctx.repository;
    }

    @DGet('', [])
    async getMany(
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const {
            data, 
            meta, 
        } = await this.service.getMany(useRequestQuery(req), actor);

        return send(res, {
            data,
            meta, 
        });
    }

    @DGet('/:id', [])
    async get(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const identity = useRequestIdentity(req);

        let isMe = false;
        if (
            identity &&
            identity.type === 'client'
        ) {
            isMe = isSelfToken(id) || identity.id === id;
        }

        if (isMe) {
            const attributesResolver = new OAuth2ScopeAttributesResolver();
            const attributes = attributesResolver.resolveFor(OAuth2SubKind.CLIENT, useRequestScopes(req));

            const entity = await this.repository.findOneByIdOrName(
                identity!.id,
                useRequestParam(req, 'realmId'),
            );

            if (!entity) {
                throw new NotFoundError();
            }

            for (const attribute of attributes) {
                const attr = attribute as keyof Client;
                if (attr === 'secret') {
                    const withSecret = await this.repository.findOneWithSecret({ id: entity.id });
                    if (withSecret) {
                        entity.secret = withSecret.secret;
                    }
                }
            }

            return send(res, entity);
        }

        const actor = buildActorContext(req);
        const entity = await this.service.getOne(id, actor, useRequestParam(req, 'realmId'));

        return send(res, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.create(data, actor);

        return sendCreated(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.update(id, data, actor);

        return sendAccepted(res, entity);
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const {
            entity, 
            created, 
        } = await this.service.save(
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
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(id, actor);

        return sendAccepted(res, entity);
    }
}
