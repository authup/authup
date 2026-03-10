/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { OAuth2SubKind } from '@authup/specs';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import {
    PermissionName, REALM_MASTER_NAME, RobotValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Realm, Robot } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { isVaultClientUsable } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import type { IRobotRepository } from '../../../../../core/index.ts';
import { OAuth2ScopeAttributesResolver, RobotCredentialsService } from '../../../../../core/index.ts';
import { RobotEntity, RobotRepository, resolveRealm } from '../../../../database/domains/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { isSelfToken } from '../../../../../utils/index.ts';
import { isRobotSynchronizationServiceUsable, useRobotSynchronizationService } from '../../../../../services/index.ts';
import {
    getRequestBodyRealmID,
    getRequestParamID,
    useRequestIdentity,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionChecker,
    useRequestScopes,
} from '../../../request/index.ts';

export type RobotControllerContext = {
    repository: IRobotRepository,
    dataSource: DataSource,
};

@DTags('robot')
@DController('/robots')
export class RobotController {
    protected repository: IRobotRepository;

    protected dataSource: DataSource;

    constructor(ctx: RobotControllerContext) {
        this.repository = ctx.repository;
        this.dataSource = ctx.dataSource;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
            ],
        });

        const { data: entities, meta } = await this.repository.findMany(useRequestQuery(req));

        const identity = useRequestIdentity(req);

        const data: Robot[] = [];
        let { total } = meta;
        for (let i = 0; i < entities.length; i++) {
            if (
                identity &&
                identity.type === 'robot' &&
                identity.id === entities[i].id
            ) {
                data.push(entities[i]);
                continue;
            }

            try {
                await permissionChecker.checkOneOf({
                    name: [
                        PermissionName.ROBOT_READ,
                        PermissionName.ROBOT_UPDATE,
                        PermissionName.ROBOT_DELETE,
                    ],
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entities[i],
                    }),
                });

                data.push(entities[i]);
            } catch (e) {
                total -= 1;
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
        @DBody() data: Robot,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res);
    }

    @DGet('/:id/integrity', [])
    async command(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.handleIntegrity(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
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
            identity &&
            identity.type === 'robot'
        ) {
            isMe = true;
        } else if (isUUID(paramId)) {
            if (
                identity &&
                identity.type === 'robot' &&
                paramId === identity.id
            ) {
                isMe = true;
            }
        } else if (
            identity &&
            identity.type === 'robot'
        ) {
            const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
            if (
                identity.realmId === realm.id &&
                identity.data &&
                identity.data.name === paramId
            ) {
                isMe = true;
            }
        }

        let entity: Robot | null;

        if (isMe) {
            const attributesResolver = new OAuth2ScopeAttributesResolver();
            const attributes = attributesResolver.resolveFor(OAuth2SubKind.ROBOT, useRequestScopes(req));

            const resolvedId = isSelfToken(paramId) ? identity!.id : paramId;
            entity = await this.repository.findOneByIdOrName(
                resolvedId,
                useRequestParam(req, 'realmId'),
            );

            if (entity) {
                const robotRepository = this.dataSource.getRepository(RobotEntity);
                const validAttributes = robotRepository.metadata.columns.map(
                    (column) => column.databaseName,
                );
                for (let i = 0; i < attributes.length; i++) {
                    const isValid = validAttributes.includes(attributes[i]);
                    if (isValid && attributes[i] === 'secret') {
                        const withSecret = await this.repository.findOneWithSecret({ id: entity.id });
                        if (withSecret) {
                            entity.secret = withSecret.secret;
                        }
                    }
                }
            }
        } else {
            await permissionChecker.preCheckOneOf({
                name: [
                    PermissionName.ROBOT_READ,
                    PermissionName.ROBOT_UPDATE,
                    PermissionName.ROBOT_DELETE,
                ],
            });

            if (isUUID(paramId)) {
                entity = await this.repository.findOneById(paramId);
            } else {
                const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
                entity = await this.repository.findOneBy({
                    name: paramId,
                    realm_id: realm.id,
                });
            }
        }

        if (!entity) {
            throw new NotFoundError();
        }

        if (!isMe) {
            await permissionChecker.check({
                name: [
                    PermissionName.ROBOT_READ,
                    PermissionName.ROBOT_UPDATE,
                    PermissionName.ROBOT_DELETE,
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
            @DBody() data: Pick<Robot, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res, {
            updateOnly: true,
        });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() data: Pick<Robot, 'name'>,
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

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        const permissionChecker = useRequestPermissionChecker(req);
        const identity = useRequestIdentity(req);
        if (
            !entity.user_id ||
            !identity ||
            identity.type !== 'user' ||
            entity.user_id !== identity.id
        ) {
            await permissionChecker.check({
                name: PermissionName.ROBOT_DELETE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });
        }

        const { id: entityId } = entity;

        await this.repository.remove(entity);

        entity.id = entityId;

        if (isRobotSynchronizationServiceUsable()) {
            const robotSynchronizationService = useRobotSynchronizationService();
            await robotSynchronizationService.remove(entity);
        }

        return sendAccepted(res, entity);
    }

    // ------------------------------------------------------------------

    private async write(req: Request, res: Response, options: {
        updateOnly?: boolean
    } = {}): Promise<any> {
        let group: string;
        const id = getRequestParamID(req, { isUUID: false });
        const realmId = getRequestBodyRealmID(req);

        let entity: Robot | null | undefined;
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
            await permissionChecker.preCheck({ name: PermissionName.ROBOT_UPDATE });

            group = ValidatorGroup.UPDATE;
        } else {
            await permissionChecker.preCheck({ name: PermissionName.ROBOT_CREATE });

            group = ValidatorGroup.CREATE;
        }

        const validator = new RobotValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group,
        });

        await this.repository.validateJoinColumns(data);

        await this.repository.checkUniqueness(data, entity || undefined);

        const credentialsService = new RobotCredentialsService();

        if (entity) {
            await permissionChecker.check({
                name: PermissionName.ROBOT_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...data,
                    },
                }),
            });

            entity = this.repository.merge(entity, data);
            if (data.secret) {
                entity.secret = await credentialsService.protect(data.secret);
            }

            await this.repository.save(entity);

            if (data.secret) {
                entity.secret = data.secret;

                if (isRobotSynchronizationServiceUsable()) {
                    const robotSynchronizationService = useRobotSynchronizationService();
                    await robotSynchronizationService.save(entity);
                }
            }

            return sendAccepted(res, entity);
        }

        if (!data.realm_id) {
            const identity = useRequestIdentityOrFail(req);
            data.realm_id = identity.realmId;
        }

        await permissionChecker.check({
            name: PermissionName.ROBOT_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: data,
            }),
        });

        if (!data.secret) {
            data.secret = credentialsService.generateSecret();
        }

        entity = this.repository.create(data);

        entity.secret = await credentialsService.protect(data.secret);
        await this.repository.save(entity);

        entity.secret = data.secret;

        if (isRobotSynchronizationServiceUsable()) {
            const robotSynchronizationService = useRobotSynchronizationService();
            await robotSynchronizationService.save(entity);
        }

        return sendCreated(res, entity);
    }

    // ------------------------------------------------------------------

    private async handleIntegrity(req: Request, res: Response): Promise<any> {
        const id = useRequestParamID(req, {
            isUUID: false,
        });

        const robotRepository = new RobotRepository(this.dataSource);
        const query = robotRepository.createQueryBuilder('robot');

        let realm: Realm | undefined;

        if (isUUID(id)) {
            query.where('robot.id = :id', { id });
        } else {
            query.where('robot.name LIKE :name', { name: id });

            realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
            query.andWhere('robot.realm_id = :realmId', { realmId: realm.id });
        }

        if (!realm) {
            query.leftJoinAndSelect('robot.realm', 'realm');
        }

        const entity = await query
            .addSelect('robot.secret')
            .getOne();

        if (!entity) {
            throw new NotFoundError();
        }

        if (entity.realm) {
            realm = entity.realm;
        }

        if (
            !isVaultClientUsable() ||
            !realm ||
            realm.name !== REALM_MASTER_NAME
        ) {
            return sendAccepted(res);
        }

        const credentialsService = new RobotCredentialsService();

        let refreshCredentials = false;
        if (entity.secret) {
            let credentials: Pick<Robot, 'id' | 'secret' | 'name'> | undefined;
            if (isRobotSynchronizationServiceUsable()) {
                const robotSynchronizationService = useRobotSynchronizationService();
                credentials = await robotSynchronizationService.find({ name: entity.name });
            }

            if (credentials) {
                const secretHashedEqual = await credentialsService.verify(credentials.secret, entity);
                if (!secretHashedEqual) {
                    refreshCredentials = true;
                }
            } else {
                refreshCredentials = true;
            }
        } else {
            refreshCredentials = true;
        }

        if (refreshCredentials) {
            const secret = credentialsService.generateSecret();
            entity.secret = await credentialsService.protect(secret);
            await robotRepository.save(entity);

            if (isRobotSynchronizationServiceUsable()) {
                const robotSynchronizationService = useRobotSynchronizationService();
                await robotSynchronizationService.save({
                    ...entity,
                    secret,
                });
            }
        }

        return sendAccepted(res);
    }
}
