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
import {
    extendObject, isUUID, removeObjectProperty,
} from '@authup/kit';
import { PermissionName } from '@authup/core-kit';
import type { Policy } from '@authup/core-kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { useRequestQuery } from '@routup/basic/query';
import { useRequestBody } from '@routup/basic/body';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { Request, Response } from 'routup';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import type { IPolicyRepository } from '../../../../../core/index.ts';
import { PolicyEngine } from '../../../../../security/index.ts';
import { resolveRealm } from '../../../../database/domains/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { PolicyValidator } from './utils/index.ts';
import {
    RequestHandlerOperation,
    getRequestBodyRealmID,
    getRequestParamID,
    isRequestIdentityMasterRealmMember,
    useRequestIdentity,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';

export type PolicyControllerContext = {
    repository: IPolicyRepository,
};

@DTags('policy')
@DController('/policies')
export class PolicyController {
    protected repository: IPolicyRepository;

    constructor(ctx: PolicyControllerContext) {
        this.repository = ctx.repository;
    }

    @DGet('', [])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        });

        const { data, meta } = await this.repository.findMany(useRequestQuery(req));

        return send(res, {
            data,
            meta,
        });
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
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        });

        const paramId = useRequestParamID(req, {
            isUUID: false,
        });

        const entity = await this.repository.findOneByIdOrName(
            paramId,
            useRequestParam(req, 'realmId'),
        );

        if (!entity) {
            throw new NotFoundError();
        }

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
            const realm = await resolveRealm(useRequestParam(req, 'realmId'));
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
        return this.write(req, res, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async replace(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const paramId = useRequestParamID(req);

        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.check({
            name: PermissionName.PERMISSION_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;

        await this.repository.deleteFromTree(entity);

        entity.id = entityId;

        // todo: remove after PolicyEntity - parent delete on cascade
        removeObjectProperty(entity, 'children');

        return sendAccepted(res, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async create(
        @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res);
    }

    // ------------------------------------------------------------------

    private async write(req: Request, res: Response, options: {
        updateOnly?: boolean
    } = {}): Promise<any> {
        let group: string;
        const id = getRequestParamID(req, { isUUID: false });
        const realmId = getRequestBodyRealmID(req);

        let entity: Policy | null | undefined;
        if (id) {
            const where: Record<string, any> = {};
            if (isUUID(id)) {
                where.id = id;
            } else {
                where.name = id;
            }

            if (realmId) {
                where.realm_id = realmId;
            }

            entity = await this.repository.findOneBy(where);
            if (!entity && options.updateOnly) {
                throw new NotFoundError();
            }
        } else if (options.updateOnly) {
            throw new NotFoundError();
        }

        const permissionChecker = useRequestPermissionChecker(req);
        if (entity) {
            await permissionChecker.preCheck({ name: PermissionName.PERMISSION_UPDATE });

            group = RequestHandlerOperation.UPDATE;
        } else {
            await permissionChecker.preCheck({ name: PermissionName.PERMISSION_CREATE });

            group = RequestHandlerOperation.CREATE;
        }

        const validator = new RoutupContainerAdapter(new PolicyValidator());
        const data = await validator.run(req, {
            group,
        });

        await this.repository.validateJoinColumns(data);

        if (
            data.parent &&
            data.parent.type !== BuiltInPolicyType.COMPOSITE
        ) {
            throw new BadRequestError('The parent policy must be of type group.');
        }

        await this.repository.checkUniqueness(data, entity || undefined);

        if (entity) {
            await permissionChecker.check({
                name: PermissionName.PERMISSION_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...data,
                    },
                }),
            });
        } else {
            if (!data.realm_id) {
                const identity = useRequestIdentityOrFail(req);
                if (!isRequestIdentityMasterRealmMember(identity)) {
                    data.realm_id = identity.realmId;
                }
            }

            await permissionChecker.check({
                name: PermissionName.PERMISSION_CREATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: data,
                }),
            });
        }

        if (entity) {
            extendObject(entity, data);

            await this.repository.saveWithEA(entity);

            return sendAccepted(res, entity);
        }

        await this.repository.saveWithEA(data as Policy);

        return sendCreated(res, data);
    }
}
