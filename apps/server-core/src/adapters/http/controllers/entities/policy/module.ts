/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyAPICheckResponse } from '@authup/core-http-kit';
import { BuiltInPolicyType, PolicyData, definePolicyEvaluationContext } from '@authup/access';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
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
import { useRequestQuery } from '@routup/basic/query';
import type { IRoutupEvent } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type {
 
    IIdentityPermissionProvider, 
    IPolicyRepository, 
    IPolicyService, 
    IRealmRepository, 
} from '../../../../../core/index.ts';
import { PolicyEngine } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
    useRequestIdentity,
} from '../../../request/index.ts';

export type PolicyControllerContext = {
    service: IPolicyService,
    repository: IPolicyRepository,
    realmRepository: IRealmRepository,
    identityPermissionProvider: IIdentityPermissionProvider,
};

@DTags('policy')
@DController('/policies')
export class PolicyController {
    protected service: IPolicyService;

    protected repository: IPolicyRepository;

    protected realmRepository: IRealmRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(ctx: PolicyControllerContext) {
        this.service = ctx.service;
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
    }

    @DGet('', [])
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

    @DGet('/:id/expanded', [])
    async getOneExpanded(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        return this.getOne(id, event, { expanded: true });
    }

    @DGet('/:id', [])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options: { expanded?: boolean } = {},
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(
            id,
            actor,
            event.params.realmId,
        );

        return entity;
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DPath('id') id: string,
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const paramId = event.params.id;

        let criteria: Record<string, any>;
        if (isUUID(paramId)) {
            criteria = { id: paramId };
        } else {
            const realm = await this.realmRepository.resolve(event.params.realmId);
            criteria = {
                name: paramId,
                ...(realm ? { realm_id: realm.id } : {}),
            };
        }

        const entity = await this.repository.findOneBy(criteria);
        if (!entity) {
            throw new NotFoundError();
        }

        if (
            !data[BuiltInPolicyType.IDENTITY] &&
            data[BuiltInPolicyType.IDENTITY] !== null
        ) {
            data[BuiltInPolicyType.IDENTITY] = useRequestIdentity(event);
        }

        const policyEngine = new PolicyEngine(this.identityPermissionProvider);

        let output: PolicyAPICheckResponse;
        try {
            await policyEngine.evaluate(entity, definePolicyEvaluationContext({ data: new PolicyData(data) }));

            output = { status: 'success' };
        } catch (e) {
            output = {
                status: 'error',
                data: e as Error,
            };
        }

        return sendAccepted(event, output);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async update(
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

        return sendAccepted(event, entity);
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async replace(
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

        if (created) {
            return sendCreated(event, entity);
        }

        return sendAccepted(event, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        return sendAccepted(event, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async create(
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        return sendCreated(event, entity);
    }
}
