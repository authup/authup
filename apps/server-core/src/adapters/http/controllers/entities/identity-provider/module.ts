/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { base64URLDecode, isUUID } from '@authup/kit';
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
import type { IRoutupEvent } from 'routup';
import {
    getRequestHeader,
    getRequestIP,
    sendRedirect,
} from 'routup';
import type { IdentityProvider, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
 
    IdentityProviderAttributesValidator, 
    IdentityProviderValidator, 
    IdentityType, 
    PermissionName, 
    ValidatorGroup, 
    isOAuth2IdentityProvider, 
    isOpenIDIdentityProvider, 
} from '@authup/core-kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { AuthorizeParameters } from '@hapic/oauth2';
import { useRequestQuery } from '@routup/basic/query';
import { readRequestBody } from '@routup/basic/body';
import { OAuth2Error } from '@authup/specs';
import type {
    EntityCollectionResponse,
    IdentityProviderCreateInput,
    IdentityProviderResponse,
    IdentityProviderSaveInput,
    IdentityProviderUpdateInput,
} from '@authup/core-http-kit';
import { URL } from 'node:url';
import type {
    IIdentityProviderAccountManager,
    IIdentityProviderRepository,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IRealmRepository,
    OAuth2AuthorizationState,
} from '../../../../../core/index.ts';
import {
    OAuth2AuthorizationCodeRequestValidator,
    createIdentityProviderOAuth2Authenticator,
} from '../../../../../core/index.ts';
import {
    getBodyRealmID,
    getRequestParamID,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionEvaluator,
} from '../../../request/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { resolveURL } from '../../../../../utils/index.ts';
import type { IdentityProviderControllerContext, IdentityProviderControllerOptions } from './types.ts';

@DTags('identity')
@DController('/identity-providers')
export class IdentityProviderController {
    protected options: IdentityProviderControllerOptions;

    protected repository: IIdentityProviderRepository;

    protected realmRepository: IRealmRepository;

    protected accountManager: IIdentityProviderAccountManager;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : OAuth2AuthorizationCodeRequestValidator;

    protected stateManager : IOAuth2AuthorizationStateManager;

    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    // ---------------------------------------------------------

    constructor(ctx: IdentityProviderControllerContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.accountManager = ctx.accountManager;
        this.codeIssuer = ctx.codeIssuer;
        this.codeRequestVerifier = ctx.codeRequestVerifier;
        this.codeRequestValidator = new OAuth2AuthorizationCodeRequestValidator();
        this.stateManager = ctx.stateManager;
    }

    // ---------------------------------------------------------

    @DGet('', [])
    async getProviders(
        @DContext() event: IRoutupEvent,
    ): Promise<EntityCollectionResponse<IdentityProviderResponse>> {
        const {
            data, 
            meta, 
        } = await this.repository.findMany(useRequestQuery(event));

        try {
            const permissionEvaluator = useRequestPermissionEvaluator(event);
            await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_READ });

            for (const datum of data) {
                try {
                    await permissionEvaluator.evaluate({
                        name: PermissionName.IDENTITY_PROVIDER_READ,
                        input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: datum }),
                    });
                } catch {
                    // do nothing
                }
            }
        } catch {
            // do nothing
        }

        return {
            data,
            meta,
        };
    }

    @DGet('/:id', [])
    async getProvider(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<IdentityProviderResponse> {
        const paramId = useRequestParamID(event, { isUUID: false });

        const entity = await this.repository.findOneByIdOrName(
            paramId,
            event.params.realmId,
        );

        if (!entity) {
            throw new NotFoundError();
        }

        try {
            const permissionEvaluator = useRequestPermissionEvaluator(event);
            await permissionEvaluator.evaluate({
                name: PermissionName.IDENTITY_PROVIDER_READ,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
            });
        } catch {
            // do nothing
        }

        return entity;
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
        @DBody() user: IdentityProviderUpdateInput,
        @DContext() event: IRoutupEvent,
    ) : Promise<IdentityProviderResponse> {
        return this.write(event, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() user: IdentityProviderSaveInput,
        @DContext() event: IRoutupEvent,
    ) : Promise<IdentityProviderResponse> {
        return this.write(event);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ) : Promise<IdentityProviderResponse> {
        const paramId = useRequestParamID(event);

        const permissionEvaluator = useRequestPermissionEvaluator(event);
        await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_DELETE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);

        entity.id = entityId;

        event.response.status = 202;

        return entity;
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: IdentityProviderCreateInput,
        @DContext() event: IRoutupEvent,
    ) : Promise<IdentityProviderResponse> {
        return this.write(event);
    }

    // ---------------------------------------------------------

    @DGet('/:id/authorize-out', [])
    async authorizeOut(
        @DPath('id') _id: string,
        @DContext() event: IRoutupEvent,
    ) {
        const id = useRequestParamID(event);
        const entity = await this.resolve(id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new BadRequestError('Only an identity-provider based on the oauth protocol supports authorize redirect.');
        }

        const authenticator = createIdentityProviderOAuth2Authenticator({
            accountManager: this.accountManager,
            provider: entity,
            options: { baseURL: this.options.baseURL },
        });

        const parameters : AuthorizeParameters = {};

        let codeRequest: OAuth2AuthorizationCodeRequest | undefined;
        const query = useRequestQuery(event);
        if (typeof query.codeRequest === 'string') {
            let codeRequestDecoded: OAuth2AuthorizationCodeRequest;

            try {
                codeRequestDecoded = JSON.parse(base64URLDecode(query.codeRequest));
            } catch {
                throw OAuth2Error.requestInvalid('The code request is malformed and can not be parsed.');
            }

            const codeRequestValidated = await this.codeRequestValidator.run(codeRequestDecoded);
            const data = await this.codeRequestVerifier.verify(codeRequestValidated);

            if (
                data.client.realm_id &&
                entity.realm_id &&
                entity.realm_id !== data.client.realm_id
            ) {
                throw OAuth2Error.requestInvalid('The provider and client realm do not match.');
            }

            codeRequest = data.data;
        }

        parameters.state = await this.saveAuthorizationState(event, codeRequest);

        return sendRedirect(event, authenticator.buildRedirectURL(parameters));
    }

    @DGet('/:id/authorize-in', [])
    async authorizeIn(
        @DPath('id') _id: string,
        @DContext() event: IRoutupEvent,
    ) {
        const id = useRequestParamID(event);

        const entity = await this.resolve(id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new Error(`The provider protocol ${entity.protocol} is not valid.`);
        }

        const data = await this.verifyAuthorizationState(event);
        if (
            entity.realm_id &&
            data.codeRequest &&
            data.codeRequest.realm_id &&
            data.codeRequest.realm_id !== entity.realm_id
        ) {
            throw OAuth2Error.requestInvalid('The provider and client realm do not match.');
        }

        const { code } = useRequestQuery(event);

        const authenticator = createIdentityProviderOAuth2Authenticator({
            accountManager: this.accountManager,
            provider: entity,
            options: {
                baseURL: this.options.baseURL,
                clientId: data.codeRequest?.client_id,
            },
        });

        const user = await authenticator.authenticate(code);

        const realm = await this.realmRepository.resolve(entity.realm_id, true);

        const authorizationCode = await this.codeIssuer.issue(
            {
                response_type: 'code',
                client_id: data.codeRequest?.client_id,
                redirect_uri: data.codeRequest?.redirect_uri,
                scope: data.codeRequest?.scope,
            },
            {
                type: IdentityType.USER,
                data: {
                    ...user,
                    realm,
                },
            },
        );

        if (data.codeRequest) {
            const codeRequestKeys = Object.keys(data.codeRequest);

            const url = new URL(resolveURL(this.options.baseURL, 'authorize'));
            for (const codeRequestKey_ of codeRequestKeys) {
                const codeRequestKey = codeRequestKey_ as keyof OAuth2AuthorizationCodeRequest;
                if (data.codeRequest[codeRequestKey]) {
                    url.searchParams.set(codeRequestKey, data.codeRequest[codeRequestKey]);
                }
            }

            url.searchParams.set('code', authorizationCode.id);

            return sendRedirect(event, url.href);
        }

        const url = new URL(this.options.baseURL);
        url.searchParams.set('code', authorizationCode.id);

        return sendRedirect(event, url.href);
    }

    // ---------------------------------------------------------

    private async write(event: IRoutupEvent, options: {
        updateOnly?: boolean
    } = {}): Promise<IdentityProviderResponse> {
        let group: string;
        const id = getRequestParamID(event, { isUUID: false });
        const body = await readRequestBody(event);
        const realmId = getBodyRealmID(body);

        let entity: IdentityProvider | null | undefined;
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

        const permissionEvaluator = useRequestPermissionEvaluator(event);
        if (entity) {
            await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_UPDATE });

            group = ValidatorGroup.UPDATE;
        } else {
            await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_CREATE });

            group = ValidatorGroup.CREATE;
        }

        const validator = new IdentityProviderValidator();
        const data = await validator.run(body, { group });

        const attributesValidator = new IdentityProviderAttributesValidator();
        const attributes = await attributesValidator.run(body);

        await this.repository.validateJoinColumns(data);

        if (entity) {
            await permissionEvaluator.evaluate({
                name: PermissionName.IDENTITY_PROVIDER_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...data,
                    },
                }),
            });
        } else {
            if (!data.realm_id) {
                const identity = useRequestIdentityOrFail(event);
                data.realm_id = identity.realmId;
            }

            await permissionEvaluator.evaluate({
                name: PermissionName.IDENTITY_PROVIDER_CREATE,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: data }),
            });
        }

        await this.repository.checkUniqueness(data, entity || undefined);

        if (entity) {
            entity = this.repository.merge(entity, data);
            await this.repository.saveWithEA(entity, attributes);

            event.response.status = 202;

            return entity;
        }

        entity = this.repository.create(data);
        await this.repository.saveWithEA(entity, attributes);

        event.response.status = 201;

        return entity;
    }

    // ---------------------------------------------------------

    private async resolve(id: string) {
        const entity = await this.repository.findOneById(id);

        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }

    // ---------------------------------------------------------

    private async saveAuthorizationState(
        event: IRoutupEvent,
        codeRequest?: OAuth2AuthorizationCodeRequest,
    ) : Promise<string> {
        return this.stateManager.save({
            codeRequest,
            ip: getRequestIP(event, { trustProxy: true }) ?? '',
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }

    private async verifyAuthorizationState(event: IRoutupEvent): Promise<OAuth2AuthorizationState> {
        const query = useRequestQuery(event);
        if (typeof query.state !== 'string') {
            throw OAuth2Error.stateInvalid();
        }

        return this.stateManager.verify(query.state, {
            ip: getRequestIP(event, { trustProxy: true }) ?? '',
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }
}
