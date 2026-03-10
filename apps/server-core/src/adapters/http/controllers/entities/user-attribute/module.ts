/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { UserAttribute } from '@authup/core-kit';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { buildErrorMessageForAttribute } from 'validup';
import type { IUserAttributeRepository } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { UserAttributeRequestValidator, canRequestManageUserAttribute } from './utils/index.ts';
import {
    RequestHandlerOperation,
    useRequestIdentity,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';

export type UserAttributeControllerContext = {
    repository: IUserAttributeRepository,
};

@DTags('user')
@DController('/user-attributes')
export class UserAttributeController {
    protected repository: IUserAttributeRepository;

    constructor(ctx: UserAttributeControllerContext) {
        this.repository = ctx.repository;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const { data: entities, meta } = await this.repository.findMany(useRequestQuery(req));

        const data: UserAttribute[] = [];
        let { total } = meta;

        for (let i = 0; i < entities.length; i++) {
            const canAbility = await canRequestManageUserAttribute(req, entities[i]);

            if (canAbility) {
                data.push(entities[i]);
            } else {
                total--;
            }
        }

        return send(res, {
            data,
            meta: {
                ...meta,
                total,
            },
        });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<UserAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const validator = new UserAttributeRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);

        const data = await validatorAdapter.run(req, {
            group: RequestHandlerOperation.CREATE,
        });

        await this.repository.validateJoinColumns(data);

        const identity = useRequestIdentity(req);
        if (data.user) {
            data.realm_id = data.user.realm_id;
        } else if (
            identity &&
            identity.type === 'user'
        ) {
            data.user_id = identity.id;
            data.realm_id = identity.realmId;
        } else {
            throw new BadRequestError(buildErrorMessageForAttribute('user_id'));
        }

        const entity = this.repository.create(data);

        const canAbility = await canRequestManageUserAttribute(
            req,
            entity,
        );
        if (!canAbility) {
            throw new ForbiddenError();
        }

        await this.repository.save(entity);

        return sendCreated(res, entity);
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
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const paramId = useRequestParamID(req);

        const entity = await this.repository.findOneBy({ id: paramId });
        if (!entity) {
            throw new NotFoundError();
        }

        const canAbility = await canRequestManageUserAttribute(req, entity);
        if (!canAbility) {
            throw new ForbiddenError();
        }

        return send(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() user: NonNullable<UserAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.checkOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const paramId = useRequestParamID(req);

        const validator = new UserAttributeRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group: RequestHandlerOperation.UPDATE,
        });

        await this.repository.validateJoinColumns(data);

        let entity = await this.repository.findOneBy({ id: paramId });
        if (!entity) {
            throw new NotFoundError();
        }

        entity = this.repository.merge(entity, data);

        const canAbility = await canRequestManageUserAttribute(req, entity);
        if (!canAbility) {
            throw new ForbiddenError();
        }

        await this.repository.save(entity);

        return sendAccepted(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const paramId = useRequestParamID(req);

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        const canAbility = await canRequestManageUserAttribute(req, entity);
        if (!canAbility) {
            throw new ForbiddenError();
        }

        const { id: entityId } = entity;

        await this.repository.remove(entity);

        entity.id = entityId;

        return sendAccepted(res, entity);
    }
}
