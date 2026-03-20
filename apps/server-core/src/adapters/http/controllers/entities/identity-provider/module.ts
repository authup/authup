/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { base64URLDecode, isUUID } from '@authup/kit';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { Request, Response } from 'routup';
import {
    getRequestHeader, getRequestHostName, getRequestIP, send, sendAccepted, sendCreated, sendRedirect, useRequestParam,
} from 'routup';
import type {
    IdentityProvider, OAuth2AuthorizationCodeRequest} from '@authup/core-kit';
import { IdentityProviderAttributesValidator, IdentityProviderValidator, IdentityType, PermissionName, ValidatorGroup, isOAuth2IdentityProvider, isOpenIDIdentityProvider } from '@authup/core-kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { AuthorizeParameters } from '@hapic/oauth2';
import { useRequestQuery } from '@routup/basic/query';
import { OAuth2Error } from '@authup/specs';
import { URL } from 'node:url';
import { setResponseCookie } from '@routup/basic/cookie';
import { CookieName } from '@authup/core-http-kit';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type {
    IIdentityProviderAccountManager,
    IIdentityProviderRepository,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    OAuth2AuthorizationState,
} from '../../../../../core/index.ts';
import {
    IdentityGrantType,
    OAuth2AuthorizationCodeRequestValidator,
    createIdentityProviderOAuth2Authenticator,
} from '../../../../../core/index.ts';
import {
    getRequestBodyRealmID,
    getRequestParamID,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import type { IdentityProviderControllerContext, IdentityProviderControllerOptions } from './types.ts';

@DTags('identity')
@DController('/identity-providers')
export class IdentityProviderController {
    protected options: IdentityProviderControllerOptions;

    protected repository: IIdentityProviderRepository;

    protected accountManager: IIdentityProviderAccountManager;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : OAuth2AuthorizationCodeRequestValidator;

    protected stateManager : IOAuth2AuthorizationStateManager;

    protected identityGrant : IdentityGrantType;

    // ---------------------------------------------------------

    constructor(ctx: IdentityProviderControllerContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
        this.accountManager = ctx.accountManager;
        this.codeRequestVerifier = ctx.codeRequestVerifier;
        this.codeRequestValidator = new OAuth2AuthorizationCodeRequestValidator();
        this.stateManager = ctx.stateManager;

        this.identityGrant = new IdentityGrantType({
            accessTokenIssuer: ctx.accessTokenIssuer,
            refreshTokenIssuer: ctx.refreshTokenIssuer,
            sessionManager: ctx.sessionManager,
        });
    }

    // ---------------------------------------------------------

    @DGet('', [])
    async getProviders(
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const { data, meta } = await this.repository.findMany(useRequestQuery(req));

        try {
            const permissionChecker = useRequestPermissionChecker(req);
            await permissionChecker.preCheck({ name: PermissionName.IDENTITY_PROVIDER_READ });

            for (const datum of data) {
                try {
                    await permissionChecker.check({
                        name: PermissionName.IDENTITY_PROVIDER_READ,
                        input: new PolicyData({
                            [BuiltInPolicyType.ATTRIBUTES]: datum,
                        }),
                    });
                } catch {
                    // do nothing
                }
            }
        } catch {
            // do nothing
        }

        return send(res, {
            data,
            meta,
        });
    }

    @DGet('/:id', [])
    async getProvider(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
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

        try {
            const permissionChecker = useRequestPermissionChecker(req);
            await permissionChecker.check({
                name: PermissionName.IDENTITY_PROVIDER_READ,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });
        } catch {
            // do nothing
        }

        return send(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
        @DBody() user: NonNullable<IdentityProvider>,
        @DRequest() req: any,
        @DResponse() res: any,
    ) : Promise<any> {
        return this.write(req, res, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() user: NonNullable<IdentityProvider>,
        @DRequest() req: any,
        @DResponse() res: any,
    ) : Promise<any> {
        return this.write(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ) : Promise<any> {
        const paramId = useRequestParamID(req);

        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.IDENTITY_PROVIDER_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.check({
            name: PermissionName.IDENTITY_PROVIDER_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);

        entity.id = entityId;

        return sendAccepted(res, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: NonNullable<IdentityProvider>,
        @DRequest() req: any,
        @DResponse() res: any,
    ) : Promise<any> {
        return this.write(req, res);
    }

    // ---------------------------------------------------------

    @DGet('/:id/authorize-out', [])
    async authorizeOut(
        @DPath('id') _id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ) {
        const id = useRequestParamID(req);
        const entity = await this.resolve(id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new BadRequestError('Only an identity-provider based on the oauth protocol supports authorize redirect.');
        }

        const authenticator = createIdentityProviderOAuth2Authenticator({
            accountManager: this.accountManager,
            provider: entity,
            options: {
                baseURL: this.options.baseURL,
            },
        });

        const parameters : AuthorizeParameters = {};

        let codeRequest: OAuth2AuthorizationCodeRequest | undefined;
        const query = useRequestQuery(req);
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

        parameters.state = await this.saveAuthorizationState(req, codeRequest);

        return sendRedirect(res, authenticator.buildRedirectURL(parameters));
    }

    @DGet('/:id/authorize-in', [])
    async authorizeIn(
        @DPath('id') _id: string,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ) {
        const id = useRequestParamID(req);

        const entity = await this.resolve(id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new Error(`The provider protocol ${entity.protocol} is not valid.`);
        }

        const data = await this.verifyAuthorizationState(req);
        if (
            entity.realm_id &&
            data.codeRequest &&
            data.codeRequest.realm_id &&
            data.codeRequest.realm_id !== entity.realm_id
        ) {
            throw OAuth2Error.requestInvalid('The provider and client realm do not match.');
        }

        const { code } = useRequestQuery(req);

        const authenticator = createIdentityProviderOAuth2Authenticator({
            accountManager: this.accountManager,
            provider: entity,
            options: {
                baseURL: this.options.baseURL,
                clientId: data.codeRequest?.client_id,
            },
        });

        const user = await authenticator.authenticate(code);

        const token = await this.identityGrant.runWith(
            {
                type: IdentityType.USER,
                data: {
                    ...user,
                    realm: entity.realm,
                },
            },
            {
                ipAddress: getRequestIP(req, { trustProxy: true }),
                userAgent: getRequestHeader(req, 'user-agent'),
            },
        );

        const domainsRaw : string[] = [
            ...this.options.cookieDomains,
        ];

        const requestHostName = getRequestHostName(req, {
            trustProxy: true,
        });
        if (requestHostName) {
            domainsRaw.push(requestHostName);
        }

        const domains = [...new Set(domainsRaw)];

        for (const domain of domains) {
            setResponseCookie(
                res,
                CookieName.ACCESS_TOKEN,
                token.access_token,
                {
                    domain,
                    maxAge: this.options.accessTokenMaxAge * 1000,
                },
            );

            if (token.refresh_token) {
                setResponseCookie(
                    res,
                    CookieName.REFRESH_TOKEN,
                    token.refresh_token,
                    {
                        domain,
                        maxAge: this.options.refreshTokenMaxAge * 1000,
                    },
                );
            }
        }

        if (data.codeRequest) {
            const codeRequestKeys = Object.keys(data.codeRequest);

            const url = new URL('/authorize', this.options.baseURL);
            for (const codeRequestKey_ of codeRequestKeys) {
                const codeRequestKey = codeRequestKey_ as keyof OAuth2AuthorizationCodeRequest;
                if (data.codeRequest[codeRequestKey]) {
                    url.searchParams.set(codeRequestKey, data.codeRequest[codeRequestKey]);
                }
            }

            return sendRedirect(res, url.href);
        }

        return sendRedirect(res, this.options.baseURL);
    }

    // ---------------------------------------------------------

    private async write(req: Request, res: Response, options: {
        updateOnly?: boolean
    } = {}): Promise<any> {
        let group: string;
        const id = getRequestParamID(req, { isUUID: false });
        const realmId = getRequestBodyRealmID(req);

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

        const permissionChecker = useRequestPermissionChecker(req);
        if (entity) {
            await permissionChecker.preCheck({ name: PermissionName.IDENTITY_PROVIDER_UPDATE });

            group = ValidatorGroup.UPDATE;
        } else {
            await permissionChecker.preCheck({ name: PermissionName.IDENTITY_PROVIDER_CREATE });

            group = ValidatorGroup.CREATE;
        }

        const validator = new RoutupContainerAdapter(new IdentityProviderValidator());
        const data = await validator.run(req, {
            group,
        });

        const attributesValidator = new RoutupContainerAdapter(new IdentityProviderAttributesValidator());
        const attributes = await attributesValidator.run(req);

        await this.repository.validateJoinColumns(data);

        if (entity) {
            await permissionChecker.check({
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
                const identity = useRequestIdentityOrFail(req);
                data.realm_id = identity.realmId;
            }

            await permissionChecker.check({
                name: PermissionName.IDENTITY_PROVIDER_CREATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: data,
                }),
            });
        }

        await this.repository.checkUniqueness(data, entity || undefined);

        if (entity) {
            entity = this.repository.merge(entity, data);
            await this.repository.saveWithEA(entity, attributes);

            return sendAccepted(res, entity);
        }

        entity = this.repository.create(data);
        await this.repository.saveWithEA(entity, attributes);

        return sendCreated(res, entity);
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
        req: Request,
        codeRequest?: OAuth2AuthorizationCodeRequest,
    ) : Promise<string> {
        return this.stateManager.save({
            codeRequest,
            ip: getRequestIP(req, {
                trustProxy: true,
            }),
            userAgent: getRequestHeader(req, 'user-agent'),
        });
    }

    private async verifyAuthorizationState(req: Request): Promise<OAuth2AuthorizationState> {
        const query = useRequestQuery(req);
        if (typeof query.state !== 'string') {
            throw OAuth2Error.stateInvalid();
        }

        return this.stateManager.verify(query.state, {
            ip: getRequestIP(req, {
                trustProxy: true,
            }),
            userAgent: getRequestHeader(req, 'user-agent'),
        });
    }
}
