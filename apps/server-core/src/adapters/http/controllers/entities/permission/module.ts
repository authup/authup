/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionAPICheckResponse } from '@authup/core-http-kit';
import type { PermissionCheckerCheckContext } from '@authup/access';
import {
    BuiltInPolicyType,
    PermissionChecker, PolicyData,
} from '@authup/access';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { DataSource } from 'typeorm';
import type { IPermissionRepository, IPermissionService, IRealmRepository } from '../../../../../core/index.ts';
import { PermissionDatabaseRepository, PolicyEngine } from '../../../../../security/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
    useRequestIdentity,
} from '../../../request/index.ts';

export type PermissionControllerContext = {
    service: IPermissionService,
    repository: IPermissionRepository,
    realmRepository: IRealmRepository,
    dataSource: DataSource,
};

@DTags('permission')
@DController('/permissions')
export class PermissionController {
    protected service: IPermissionService;

    protected repository: IPermissionRepository;

    protected realmRepository: IRealmRepository;

    protected dataSource: DataSource;

    constructor(ctx: PermissionControllerContext) {
        this.service = ctx.service;
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.dataSource = ctx.dataSource;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const { data, meta } = await this.service.getMany(useRequestQuery(req), actor);

        return send(res, { data, meta });
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

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DBody() data: any,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const id = useRequestParam(req, 'id');

        let criteria: Record<string, any>;
        if (isUUID(id)) {
            criteria = { id };
        } else {
            const realm = await this.realmRepository.resolve(useRequestParam(req, 'realmId'));
            criteria = {
                name: id,
                ...(realm ? { realm_id: realm.id } : {}),
            };
        }

        const entity = await this.repository.findOneBy(criteria);
        if (!entity) {
            throw new NotFoundError();
        }

        if (typeof data[BuiltInPolicyType.IDENTITY] === 'undefined') {
            data[BuiltInPolicyType.IDENTITY] = useRequestIdentity(req);
        }

        const ctx: PermissionCheckerCheckContext = {
            name: entity.name,
            input: new PolicyData(data),
        };

        const permissionChecker = new PermissionChecker({
            repository: new PermissionDatabaseRepository(this.dataSource),
            policyEngine: new PolicyEngine(),
        });

        let output: PermissionAPICheckResponse;
        try {
            if (
                ctx.input &&
                ctx.input.has(BuiltInPolicyType.ATTRIBUTES)
            ) {
                await permissionChecker.check(ctx);
            } else {
                await permissionChecker.preCheck(ctx);
            }

            output = {
                status: 'success',
            };
        } catch (e) {
            output = {
                status: 'error',
                data: e as Error,
            };
        }

        return sendAccepted(res, output);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.getOne(
            id,
            actor,
            useRequestParam(req, 'realmId'),
        );

        return send(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: any,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
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
    ): Promise<any> {
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
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(id, actor);

        return sendAccepted(res, entity);
    }
}
