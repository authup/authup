/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyAPICheckResponse } from '@authup/core-http-kit';
import {
    BuiltInPolicyType, PolicyData, definePolicyEvaluationContext,
} from '@authup/access';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { useRequestQuery } from '@routup/basic/query';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import type { IIdentityPermissionProvider, IPolicyRepository, IPolicyService, IRealmRepository } from '../../../../../core/index.ts';
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
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const { data, meta } = await this.service.getMany(useRequestQuery(req), actor);

        return send(res, { data, meta });
    }

    @DGet('/:id/expanded', [])
    async getOneExpanded(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        return this.getOne(id, req, res, { expanded: true });
    }

    @DGet('/:id', [])
    async getOne(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options: { expanded?: boolean } = {},
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.getOne(
            id,
            actor,
            useRequestParam(req, 'realmId'),
        );

        return send(res, entity);
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DPath('id') id: string,
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const paramId = useRequestParam(req, 'id');

        let criteria: Record<string, any>;
        if (isUUID(paramId)) {
            criteria = { id: paramId };
        } else {
            const realm = await this.realmRepository.resolve(useRequestParam(req, 'realmId'));
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
            data[BuiltInPolicyType.IDENTITY] = useRequestIdentity(req);
        }

        const policyEngine = new PolicyEngine(this.identityPermissionProvider);

        let output: PolicyAPICheckResponse;
        try {
            await policyEngine.evaluate(entity, definePolicyEvaluationContext({
                data: new PolicyData(data),
            }));

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

    @DPost('/:id', [ForceLoggedInMiddleware])
    async update(
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
    async replace(
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

    @DPost('', [ForceLoggedInMiddleware])
    async create(
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.create(data, actor);

        return sendCreated(res, entity);
    }
}
