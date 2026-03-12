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
    ClientValidator, PermissionName,
} from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { IClientRepository, IRealmRepository } from '../../../../../core/index.ts';
import { ClientCredentialsService, OAuth2ScopeAttributesResolver } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { isSelfToken } from '../../../../../utils/index.ts';
import {
    RequestHandlerOperation,
    getRequestBodyRealmID,
    getRequestParamID,
    useRequestIdentity,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionChecker,
    useRequestScopes,
} from '../../../request/index.ts';

export type ClientControllerContext = {
    repository: IClientRepository,
    realmRepository: IRealmRepository,
};

@DTags('oauth2')
@DController('/clients')
export class ClientController {
    protected repository: IClientRepository;

    protected realmRepository: IRealmRepository;

    constructor(ctx: ClientControllerContext) {
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
    }

    @DGet('', [])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.CLIENT_READ,
                PermissionName.CLIENT_UPDATE,
                PermissionName.CLIENT_DELETE,
            ],
        });

        const { data: entities, meta } = await this.repository.findMany(useRequestQuery(req));
        let { total } = meta;

        const output: Client[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            if (
                entity.secret &&
                !entity.secret_encrypted &&
                !entity.secret_hashed
            ) {
                try {
                    await permissionChecker.checkOneOf({
                        name: [
                            PermissionName.CLIENT_READ,
                            PermissionName.CLIENT_UPDATE,
                            PermissionName.CLIENT_DELETE,
                        ],
                        input: new PolicyData({
                            [BuiltInPolicyType.ATTRIBUTES]: entity,
                        }),
                    });
                    output.push(entity);
                } catch (e) {
                    total -= 1;
                }

                continue;
            }

            output.push(entity);
        }

        return send(res, {
            data: output,
            meta: {
                ...meta,
                total,
            },
        });
    }

    @DGet('/:id', [])
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
            identity &&
            identity.type === 'client'
        ) {
            isMe = isSelfToken(paramId) || identity.id === paramId;
        }

        let entity: Client | null;

        if (isMe) {
            const attributesResolver = new OAuth2ScopeAttributesResolver();
            const attributes = attributesResolver.resolveFor(OAuth2SubKind.CLIENT, useRequestScopes(req));

            entity = await this.repository.findOneByIdOrName(
                identity!.id,
                useRequestParam(req, 'realmId'),
            );

            if (entity) {
                for (let i = 0; i < attributes.length; i++) {
                    const attr = attributes[i] as keyof Client;
                    if (attr === 'secret') {
                        const withSecret = await this.repository.findOneWithSecret({ id: entity.id });
                        if (withSecret) {
                            entity.secret = withSecret.secret;
                        }
                    }
                }
            }
        } else if (isUUID(paramId)) {
            entity = await this.repository.findOneByIdOrName(
                paramId,
                useRequestParam(req, 'realmId'),
            );
        } else {
            const realm = await this.realmRepository.resolve(useRequestParam(req, 'realmId'), true);
            entity = await this.repository.findOneBy({
                name: paramId,
                realm_id: realm.id,
            });
        }

        if (!entity) {
            throw new NotFoundError();
        }

        if (!isMe) {
            if (
                entity.secret &&
                !entity.secret_encrypted &&
                !entity.secret_hashed
            ) {
                await permissionChecker.checkOneOf({
                    name: [
                        PermissionName.CLIENT_READ,
                        PermissionName.CLIENT_UPDATE,
                        PermissionName.CLIENT_DELETE,
                    ],
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                    }),
                });
            }
        }

        return send(res, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: NonNullable<Client>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Client>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        return this.write(req, res, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Client>,
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
        await permissionChecker.preCheck({ name: PermissionName.CLIENT_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.check({
            name: PermissionName.CLIENT_DELETE,
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

        let entity: Client | null | undefined;
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

            entity = await this.repository.findOneWithSecret(where);
            if (!entity && options.updateOnly) {
                throw new NotFoundError();
            }
        } else if (options.updateOnly) {
            throw new NotFoundError();
        }

        const permissionChecker = useRequestPermissionChecker(req);
        if (entity) {
            await permissionChecker.preCheck({ name: PermissionName.CLIENT_UPDATE });

            group = RequestHandlerOperation.UPDATE;
        } else {
            await permissionChecker.preCheck({ name: PermissionName.CLIENT_CREATE });

            group = RequestHandlerOperation.CREATE;
        }

        const validator = new ClientValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group,
        });

        await this.repository.validateJoinColumns(data);

        await this.repository.checkUniqueness(data, entity || undefined);

        const credentialsService = new ClientCredentialsService();

        if (entity) {
            if (
                !data.realm_id &&
                !entity.realm_id
            ) {
                const identity = useRequestIdentityOrFail(req);
                data.realm_id = identity.realmId;
            }

            entity = this.repository.merge(entity, data);

            await permissionChecker.check({
                name: PermissionName.CLIENT_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });

            if (entity.is_confidential) {
                if (!data.secret && !entity.secret) {
                    data.secret = credentialsService.generateSecret();
                }

                if (data.secret) {
                    entity.secret = await credentialsService.protect(data.secret, entity);
                }
            } else {
                entity.secret = null;
            }

            await this.repository.save(entity);

            return sendAccepted(res, entity);
        }

        if (!data.realm_id) {
            const identity = useRequestIdentityOrFail(req);
            data.realm_id = identity.realmId;
        }

        await permissionChecker.check({
            name: PermissionName.CLIENT_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: data,
            }),
        });

        entity = this.repository.create(data);

        if (entity.is_confidential) {
            if (!data.secret) {
                data.secret = credentialsService.generateSecret();
            }

            entity.secret = await credentialsService.protect(data.secret, data);
        } else {
            entity.secret = null;
        }

        await this.repository.save(entity);

        return sendCreated(res, entity);
    }
}
