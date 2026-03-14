/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2SubKind } from '@authup/specs';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import { REALM_MASTER_NAME } from '@authup/core-kit';
import type { Realm, Robot } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { useRequestBody } from '@routup/basic/body';
import { isVaultClientUsable } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import type { IRealmRepository, IRobotRepository, IRobotService } from '../../../../../core/index.ts';
import { OAuth2ScopeAttributesResolver, RobotCredentialsService } from '../../../../../core/index.ts';
import { RobotEntity, RobotRepository } from '../../../../database/domains/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { isSelfToken } from '../../../../../utils/index.ts';
import { isRobotSynchronizationServiceUsable, useRobotSynchronizationService } from '../../../../../services/index.ts';
import {
    buildActorContext,
    getRequestParamID,
    useRequestIdentity,
    useRequestParamID,
    useRequestScopes,
} from '../../../request/index.ts';

export type RobotControllerContext = {
    service: IRobotService,
    repository: IRobotRepository,
    realmRepository: IRealmRepository,
    dataSource: DataSource,
};

@DTags('robot')
@DController('/robots')
export class RobotController {
    protected service: IRobotService;

    protected repository: IRobotRepository;

    protected realmRepository: IRealmRepository;

    protected dataSource: DataSource;

    constructor(ctx: RobotControllerContext) {
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
        @DBody() data: Robot,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const { entity } = await this.service.save(undefined, useRequestBody(req), actor);

        if (isRobotSynchronizationServiceUsable()) {
            const robotSynchronizationService = useRobotSynchronizationService();
            await robotSynchronizationService.save(entity);
        }

        return sendCreated(res, entity);
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
            const realm = await this.realmRepository.resolve(useRequestParam(req, 'realmId'), true);
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
            const actor = buildActorContext(req);
            entity = await this.service.getOne(
                paramId,
                actor,
                useRequestParam(req, 'realmId'),
            );

            return send(res, entity);
        }

        if (!entity) {
            throw new NotFoundError();
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
        const actor = buildActorContext(req);
        const body = useRequestBody(req);
        const { entity } = await this.service.save(
            useRequestParamID(req, { isUUID: false }),
            body,
            actor,
            { updateOnly: true },
        );

        if (body.secret) {
            if (isRobotSynchronizationServiceUsable()) {
                const robotSynchronizationService = useRobotSynchronizationService();
                await robotSynchronizationService.save(entity);
            }
        }

        return sendAccepted(res, entity);
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() data: Pick<Robot, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const body = useRequestBody(req);
        const paramId = getRequestParamID(req, { isUUID: false });
        const { entity, created } = await this.service.save(
            paramId || undefined,
            body,
            actor,
        );

        if (created || body.secret) {
            if (isRobotSynchronizationServiceUsable()) {
                const robotSynchronizationService = useRobotSynchronizationService();
                await robotSynchronizationService.save(entity);
            }
        }

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

        if (isRobotSynchronizationServiceUsable()) {
            const robotSynchronizationService = useRobotSynchronizationService();
            await robotSynchronizationService.remove(entity);
        }

        return sendAccepted(res, entity);
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

            realm = await this.realmRepository.resolve(useRequestParam(req, 'realmId'), true);
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
