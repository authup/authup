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
import { isPropertySet, isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName, PermissionValidator, ValidatorGroup,
} from '@authup/core-kit';
import type { Permission } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { useRequestBody } from '@routup/basic/body';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { DataSource } from 'typeorm';
import type { IPermissionRepository, IPolicyRepository, IRealmRepository } from '../../../../../core/index.ts';
import { PermissionDatabaseRepository, PolicyEngine } from '../../../../../security/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    getRequestBodyRealmID,
    getRequestParamID,
    isRequestIdentityMasterRealmMember,
    useRequestIdentity,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';

export type PermissionControllerContext = {
    repository: IPermissionRepository,
    realmRepository: IRealmRepository,
    policyRepository: IPolicyRepository,
    dataSource: DataSource,
    defaultPolicyId?: string,
};

@DTags('permission')
@DController('/permissions')
export class PermissionController {
    protected repository: IPermissionRepository;

    protected realmRepository: IRealmRepository;

    protected policyRepository: IPolicyRepository;

    protected dataSource: DataSource;

    protected defaultPolicyId?: string;

    constructor(ctx: PermissionControllerContext) {
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.policyRepository = ctx.policyRepository;
        this.dataSource = ctx.dataSource;
        this.defaultPolicyId = ctx.defaultPolicyId;
    }

    @DGet('', [ForceLoggedInMiddleware])
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

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: NonNullable<Permission>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res);
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DBody() body: NonNullable<Record<string, any>>,
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

        const data = useRequestBody(req);
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

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Permission>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Permission>,
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

        if (entity.built_in) {
            throw new BadRequestError('A built-in permission can not be deleted.');
        }

        await permissionChecker.check({
            name: PermissionName.PERMISSION_DELETE,
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
        const realmId = getRequestBodyRealmID(req);

        let entity: Permission | null | undefined;
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

            group = ValidatorGroup.UPDATE;
        } else {
            await permissionChecker.preCheck({ name: PermissionName.PERMISSION_CREATE });

            group = ValidatorGroup.CREATE;
        }

        const validator = new PermissionValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group,
        });

        await this.repository.validateJoinColumns(data);

        if (entity) {
            if (
                entity.built_in &&
                isPropertySet(data, 'name') &&
                entity.name !== data.name
            ) {
                throw new BadRequestError('The name of a built-in permission can not be changed.');
            }

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

        await this.repository.checkUniqueness(data, entity || undefined);

        if (entity) {
            entity = this.repository.merge(entity, data);

            if (
                data.policy &&
                data.policy.realm_id &&
                entity.realm_id &&
                data.policy.realm_id !== entity.realm_id
            ) {
                throw new BadRequestError('Policy realm and permission realm must be equal.');
            }

            await this.repository.save(entity);

            return sendAccepted(res, entity);
        }

        if (
            data.policy &&
            data.policy.realm_id &&
            data.realm_id &&
            data.policy.realm_id !== data.realm_id
        ) {
            throw new BadRequestError('Policy realm and permission realm must be equal.');
        }

        if (this.defaultPolicyId && !data.policy_id) {
            data.policy_id = this.defaultPolicyId;
        }

        entity = this.repository.create(data);

        await this.repository.saveWithAdminRoleAssignment(entity);

        return sendCreated(res, entity);
    }
}
