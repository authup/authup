/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionAPICheckResponse } from '@authup/core-http-kit';
import type { IPermissionProvider, PermissionEvaluationContext } from '@authup/access';
import {
    BuiltInPolicyType,
    PermissionEvaluator, 
    PolicyData,
} from '@authup/access';
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
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import type { IRoutupEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
 
    IIdentityPermissionProvider, 
    IPermissionRepository, 
    IPermissionService, 
    IRealmRepository, 
} from '../../../../../core/index.ts';
import { PolicyEngine } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
    useRequestIdentity,
} from '../../../request/index.ts';

export type PermissionControllerContext = {
    service: IPermissionService,
    repository: IPermissionRepository,
    realmRepository: IRealmRepository,
    identityPermissionProvider: IIdentityPermissionProvider,
    permissionProvider: IPermissionProvider,
};

@DTags('permission')
@DController('/permissions')
export class PermissionController {
    protected service: IPermissionService;

    protected repository: IPermissionRepository;

    protected realmRepository: IRealmRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected permissionProvider: IPermissionProvider;

    constructor(ctx: PermissionControllerContext) {
        this.service = ctx.service;
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.permissionProvider = ctx.permissionProvider;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);
        const {
            data, 
            meta, 
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta, 
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const { id } = event.params;

        let criteria: Record<string, any>;
        if (isUUID(id)) {
            criteria = { id };
        } else {
            const realm = await this.realmRepository.resolve(event.params.realmId);
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
            data[BuiltInPolicyType.IDENTITY] = useRequestIdentity(event);
        }

        const ctx: PermissionEvaluationContext = {
            name: entity.name,
            input: new PolicyData(data),
        };

        const permissionEvaluator = new PermissionEvaluator({
            provider: this.permissionProvider,
            policyEngine: new PolicyEngine(this.identityPermissionProvider),
        });

        let output: PermissionAPICheckResponse;
        try {
            if (
                ctx.input &&
                ctx.input.has(BuiltInPolicyType.ATTRIBUTES)
            ) {
                await permissionEvaluator.evaluate(ctx);
            } else {
                await permissionEvaluator.preEvaluate(ctx);
            }

            output = { status: 'success' };
        } catch (e) {
            output = {
                status: 'error',
                data: e as Error,
            };
        }

        event.response.status = 202;
        return output;
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(
            id,
            actor,
            event.params.realmId,
        );

        return entity;
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
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
    ): Promise<any> {
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
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return entity;
    }
}
