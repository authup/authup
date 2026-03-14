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
import type { Policy } from '@authup/core-kit';
import { NotFoundError } from '@ebec/http';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { useRequestQuery } from '@routup/basic/query';
import { useRequestBody } from '@routup/basic/body';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import type { IPolicyRepository, IPolicyService, IRealmRepository } from '../../../../../core/index.ts';
import { PolicyEngine } from '../../../../../security/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { PolicyValidator } from './utils/index.ts';
import {
    buildActorContext,
    getRequestParamID,
    useRequestIdentity,
    useRequestParamID,
} from '../../../request/index.ts';

export type PolicyControllerContext = {
    service: IPolicyService,
    repository: IPolicyRepository,
    realmRepository: IRealmRepository,
};

@DTags('policy')
@DController('/policies')
export class PolicyController {
    protected service: IPolicyService;

    protected repository: IPolicyRepository;

    protected realmRepository: IRealmRepository;

    constructor(ctx: PolicyControllerContext) {
        this.service = ctx.service;
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
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
            useRequestParamID(req, { isUUID: false }),
            actor,
            useRequestParam(req, 'realmId'),
        );

        return send(res, entity);
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DPath('id') id: string,
            @DBody() body: Record<string, any>,
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

        const data = useRequestBody(req);
        if (
            !data[BuiltInPolicyType.IDENTITY] &&
            data[BuiltInPolicyType.IDENTITY] !== null
        ) {
            data[BuiltInPolicyType.IDENTITY] = useRequestIdentity(req);
        }

        const policyEngine = new PolicyEngine();

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
            @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const validator = new RoutupContainerAdapter(new PolicyValidator());
        const validated = await validator.run(req, {
            group: 'update',
        });

        const entity = await this.service.update(
            useRequestParamID(req, { isUUID: false }),
            validated,
            actor,
        );

        return sendAccepted(res, entity);
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async replace(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const paramId = getRequestParamID(req, { isUUID: false });

        const validator = new RoutupContainerAdapter(new PolicyValidator());
        const validated = await validator.run(req, {
            group: 'create',
        });

        const { entity, created } = await this.service.save(
            paramId || undefined,
            validated,
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
        const entity = await this.service.delete(useRequestParamID(req), actor);

        return sendAccepted(res, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async create(
        @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const validator = new RoutupContainerAdapter(new PolicyValidator());
        const validated = await validator.run(req, {
            group: 'create',
        });

        const entity = await this.service.create(validated, actor);

        return sendCreated(res, entity);
    }
}
