/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import {
    isUUID, removeObjectProperty,
} from '@authup/kit';
import {
    PermissionName, UserValidator, ValidatorGroup,
} from '@authup/core-kit';
import type { User } from '@authup/core-kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { Request, Response } from 'routup';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import type { IUserRepository } from '../../../../../core/index.ts';
import { UserCredentialsService } from '../../../../../core/index.ts';
import { isSelfToken } from '../../../../../utils/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    getRequestBodyRealmID,
    getRequestParamID,
    useRequestIdentity,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';

export type UserControllerContext = {
    repository: IUserRepository,
};

@DTags('user')
@DController('/users')
export class UserController {
    protected repository: IUserRepository;

    constructor(ctx: UserControllerContext) {
        this.repository = ctx.repository;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        const identity = useRequestIdentity(req);

        const { data, meta } = await this.repository.findMany(useRequestQuery(req));

        const filtered: User[] = [];
        let { total } = meta;

        for (let i = 0; i < data.length; i++) {
            if (
                identity &&
                identity.type === 'user' &&
                identity.id === data[i].id
            ) {
                filtered.push(data[i]);
                continue;
            }

            try {
                await permissionChecker.checkOneOf({
                    name: [
                        PermissionName.USER_READ,
                        PermissionName.USER_UPDATE,
                        PermissionName.USER_DELETE,
                    ],
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: data[i],
                    }),
                });

                filtered.push(data[i]);
            } catch (e) {
                total -= 1;
            }
        }

        return send(res, {
            data: filtered,
            meta: {
                ...meta,
                total,
            },
        });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: NonNullable<User>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        const paramId = useRequestParamID(req, {
            isUUID: false,
        });

        const identity = useRequestIdentity(req);
        let isMe = false;

        if (
            isSelfToken(paramId) &&
            !!identity &&
            identity.type === 'user'
        ) {
            isMe = true;
        } else if (isUUID(paramId)) {
            if (!!identity && identity.type === 'user' && paramId === identity.id) {
                isMe = true;
            }
        } else if (
            !!identity &&
            identity.type === 'user' &&
            identity.data &&
            identity.data.name === paramId
        ) {
            isMe = true;
        }

        if (!isMe) {
            await permissionChecker.preCheckOneOf({
                name: [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
            });
        }

        let entity: User | null;
        if (isSelfToken(paramId) && !!identity && identity.type === 'user') {
            entity = await this.repository.findOne(identity.id, useRequestQuery(req));
        } else {
            entity = await this.repository.findOne(
                paramId,
                useRequestQuery(req),
                useRequestParam(req, 'realmId'),
            );
        }

        if (!entity) {
            throw new NotFoundError();
        }

        if (!isMe) {
            await permissionChecker.checkOneOf({
                name: [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });
        }

        return send(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: NonNullable<User>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() data: NonNullable<User>,
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
        await permissionChecker.preCheck({ name: PermissionName.USER_DELETE });

        const identity = useRequestIdentityOrFail(req);
        if (
            identity.type === 'user' &&
            identity.id === paramId
        ) {
            throw new BadRequestError('The own user can not be deleted.');
        }

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.check({
            name: PermissionName.USER_DELETE,
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

        let entity: User | null | undefined;
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

        let hasAbility: boolean | undefined;
        const permissionChecker = useRequestPermissionChecker(req);
        if (entity) {
            try {
                await permissionChecker.preCheck({
                    name: PermissionName.USER_UPDATE,
                });
                hasAbility = true;
            } catch (e) {
                const identity = useRequestIdentityOrFail(req);
                if (identity.type !== 'user' || identity.id !== entity.id) {
                    throw e;
                }
            }

            group = ValidatorGroup.UPDATE;
        } else {
            await permissionChecker.preCheck({
                name: PermissionName.USER_CREATE,
            });
            hasAbility = true;

            group = ValidatorGroup.CREATE;
        }

        const validator = new UserValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group,
        });

        await this.repository.validateJoinColumns(data);

        if (!hasAbility) {
            removeObjectProperty(data, 'name_locked');
            removeObjectProperty(data, 'active');
            removeObjectProperty(data, 'status');
            removeObjectProperty(data, 'status_message');
        }

        const credentialsService = new UserCredentialsService();

        if (entity) {
            entity = this.repository.merge(entity, data);

            if (
                data.name &&
                data.name !== entity.name
            ) {
                if (data.name_locked) {
                    entity.name_locked = data.name_locked;
                }

                if (entity.name_locked) {
                    removeObjectProperty(data, 'name');
                }
            }

            if (hasAbility) {
                await permissionChecker.check({
                    name: PermissionName.USER_UPDATE,
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: {
                            ...entity,
                            ...data,
                        },
                    }),
                });
            }

            if (data.password) {
                entity.password = await credentialsService.protect(data.password);
            }

            await this.repository.save(entity);

            if (data.password) {
                entity.password = data.password;
            }

            return sendAccepted(res, entity);
        }

        if (!data.realm_id) {
            const { realmId: identityRealmId } = useRequestIdentityOrFail(req);
            data.realm_id = identityRealmId;
        }

        entity = this.repository.create(data);

        if (hasAbility) {
            await permissionChecker.check({
                name: PermissionName.USER_CREATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });
        }

        if (data.password) {
            entity.password = await credentialsService.protect(data.password);
        }

        await this.repository.save(entity);

        if (data.password) {
            entity.password = data.password;
        }

        return sendCreated(res, entity);
    }
}
