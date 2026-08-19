/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import {
    ValidatorGroup,
    base64URLDecode,
    isObject,
    isUUID,
} from '@authup/kit';
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
import type { IAppEvent } from 'routup';
import {
    getRequestHeader,
    getRequestIP,
    sendRedirect,
} from 'routup';
import type {
    IdentityProvider,
    IdentityProviderAccount,
    OAuth2AuthorizationCodeRequest,
    OAuth2IdentityProvider,
    OpenIDIdentityProvider,
} from '@authup/core-kit';
import {
    EventName,
    EventRefType,
    EventScope,
    IdentityProviderAttributesValidator,
    IdentityProviderValidator,
    IdentityType,
    PermissionName,
    isOAuth2IdentityProvider,
    isOpenIDIdentityProvider,
} from '@authup/core-kit';
import { BadRequestError, EntityNotFoundError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import { describeError, resolveURL } from '../../../../../utils/index.ts';
import { useRequestQuery } from '@routup/basic/query';
import { readRequestBody } from '@routup/basic/body';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2RequestError } from '@authup/specs';
import type {
    EntityCollectionResponse,
    EntityRecordResponse,
    IdentityProviderCreatePayload,
    IdentityProviderLinkConfirmPayload,
    IdentityProviderLinkRequestResponse,
    IdentityProviderLoginCompletePayload,
    IdentityProviderSavePayload,
    IdentityProviderUpdatePayload,
} from '@authup/core-http-kit';
import { URL } from 'node:url';
import type {
    IEventService,
    IIdentityProviderAccountLinkStore,
    IIdentityProviderAccountManager,
    IIdentityProviderRepository,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IOAuth2FederatedLoginService,
    IdentityProviderIdentity,
    OAuth2AuthorizationState,
    OAuth2AuthorizationStateLink,
} from '../../../../../core/index.ts';
import {
    OAuth2AuthorizationCodeRequestValidator,
    RECORD_QUERY_PARAMETERS,
    createIdentityProviderOAuth2Authenticator,
    decodeQuery,
    describeQuerySchema,
    identityProviderSchema,
} from '../../../../../core/index.ts';
import {
    applyRouteRealmIDToBody,
    buildActorContext,
    getBodyRealmID,
    getRequestParamID,
    getRequestRealmID,
    useRequestEventContext,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionEvaluator,
} from '../../../request/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import type { IdentityProviderControllerContext, IdentityProviderControllerOptions } from './types.ts';

@DTags('identity')
@DController(['/identity-providers', '/realms/:realmId/identity-providers'])
export class IdentityProviderController {
    protected options: IdentityProviderControllerOptions;

    protected repository: IIdentityProviderRepository;

    protected accountManager: IIdentityProviderAccountManager;

    protected linkStore: IIdentityProviderAccountLinkStore;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : OAuth2AuthorizationCodeRequestValidator;

    protected stateManager : IOAuth2AuthorizationStateManager;

    protected loginService : IOAuth2FederatedLoginService;

    protected eventService? : IEventService;

    protected logger? : Logger;

    // ---------------------------------------------------------

    constructor(ctx: IdentityProviderControllerContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
        this.accountManager = ctx.accountManager;
        this.linkStore = ctx.linkStore;
        this.codeRequestVerifier = ctx.codeRequestVerifier;
        this.codeRequestValidator = new OAuth2AuthorizationCodeRequestValidator();
        this.stateManager = ctx.stateManager;
        this.loginService = ctx.loginService;
        this.eventService = ctx.eventService;
        this.logger = ctx.logger;
    }

    // ---------------------------------------------------------

    @DGet('', [])
    async getProviders(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<IdentityProvider>> {
        const {
            data,
            meta,
        } = await this.repository.findMany(
            await decodeQuery(useRequestQuery(event), {
                schema: identityProviderSchema,
                actor: buildActorContext(event),
            }),
        );

        try {
            const permissionEvaluator = useRequestPermissionEvaluator(event);
            await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_READ });

            for (const datum of data) {
                try {
                    await permissionEvaluator.evaluate({
                        name: PermissionName.IDENTITY_PROVIDER_READ,
                        data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: datum, [BuiltInPolicyType.REALM_MATCH]: datum.realmId ?? null }),
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
            meta: {
                ...meta,
                schema: describeQuerySchema(identityProviderSchema),
            },
        };
    }

    @DGet('/:id', [])
    async getProvider(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<IdentityProvider>> {
        const paramId = useRequestParamID(event, { isUUID: false });

        const entity = await this.repository.findOneByIdOrName(
            paramId,
            getRequestRealmID(event),
        );

        if (!entity) {
            throw new EntityNotFoundError();
        }

        try {
            const permissionEvaluator = useRequestPermissionEvaluator(event);
            await permissionEvaluator.evaluate({
                name: PermissionName.IDENTITY_PROVIDER_READ,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, [BuiltInPolicyType.REALM_MATCH]: entity.realmId ?? null }),
            });
        } catch {
            // do nothing
        }

        return { data: entity, meta: { schema: describeQuerySchema(identityProviderSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
        @DBody() user: IdentityProviderUpdatePayload,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordResponse<IdentityProvider>> {
        return this.write(event, { updateOnly: true });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() user: IdentityProviderSavePayload,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordResponse<IdentityProvider>> {
        return this.write(event);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordResponse<IdentityProvider>> {
        const paramId = useRequestParamID(event);

        const permissionEvaluator = useRequestPermissionEvaluator(event);
        await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        await permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_DELETE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, [BuiltInPolicyType.REALM_MATCH]: entity.realmId ?? null }),
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);

        entity.id = entityId;

        event.response.status = 202;

        return { data: entity, meta: {} };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: IdentityProviderCreatePayload,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordResponse<IdentityProvider>> {
        return this.write(event);
    }

    // ---------------------------------------------------------

    @DGet('/:id/authorize-out', [])
    async authorizeOut(
        @DPath('id') _id: string,
        @DContext() event: IAppEvent,
    ) {
        const id = useRequestParamID(event);
        const entity = await this.resolve(id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new BadRequestError('Only an identity-provider based on the oauth protocol supports authorize redirect.');
        }

        // Refused here as well as at the callback, so a disabled provider
        // costs no provider round trip.
        if (!entity.enabled) {
            throw new BadRequestError('The identity provider is not enabled.');
        }

        // A federated login completes an RP's authorization request: the
        // callback mints a code bound to that request and delivers it to the
        // request's redirect_uri. Without one there is nowhere to deliver a
        // code (the callback used to mint an unbound one and hand it to the
        // server root, issue #3457), so the login must not start.
        const query = useRequestQuery(event);
        if (typeof query.codeRequest !== 'string') {
            throw OAuth2RequestError.malformed('A federated login requires an authorization code request.');
        }

        let codeRequestDecoded: OAuth2AuthorizationCodeRequest;

        try {
            codeRequestDecoded = JSON.parse(base64URLDecode(query.codeRequest));
        } catch {
            throw OAuth2RequestError.malformed('The code request is malformed and can not be parsed.');
        }

        const codeRequestValidated = await this.codeRequestValidator.run(codeRequestDecoded);
        const data = await this.codeRequestVerifier.verify(codeRequestValidated);

        if (
            data.client.realmId &&
            entity.realmId &&
            entity.realmId !== data.client.realmId
        ) {
            throw OAuth2RequestError.malformed('The provider and client realm do not match.');
        }

        const authenticator = this.buildProviderAuthenticator(entity);

        // Minted by the hosted login form and kept in that origin's session
        // storage (plan 094). It is what ties the login handle the callback
        // returns to the browser that started the login, so a login without
        // one could only end in a handle nobody may redeem.
        //
        // The answer is the hosted page rather than an error: the form
        // carries the challenge on the tile's href from the moment it
        // hydrates, so a start without one is a click that raced the page,
        // and the person just clicks again. This is a top-level navigation in
        // the middle of a login either way, never a place for a JSON body.
        if (typeof query.loginChallenge !== 'string' || query.loginChallenge.length === 0) {
            return sendRedirect(event, this.buildHostedAuthorizeURL(data.data).href);
        }

        const state = await this.saveAuthorizationState(event, {
            codeRequest: data.data,
            loginChallenge: query.loginChallenge,
        });

        return sendRedirect(event, authenticator.buildRedirectURL({ state }));
    }

    @DPost('/:id/link-request', [ForceLoggedInMiddleware])
    async linkRequest(
        @DPath('id') _id: string,
        @DContext() event: IAppEvent,
    ) : Promise<IdentityProviderLinkRequestResponse> {
        const id = useRequestParamID(event);
        const entity = await this.resolve(id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new BadRequestError('Only an identity-provider based on the oauth protocol supports account linking.');
        }

        if (!entity.enabled) {
            throw new BadRequestError('The identity provider is not enabled.');
        }

        const identity = useRequestIdentityOrFail(event);
        if (identity.type !== IdentityType.USER) {
            throw new BadRequestError('Only a user can link an identity provider account.');
        }

        if (entity.realmId && entity.realmId !== identity.realmId) {
            throw new BadRequestError('The identity provider does not belong to the user realm.');
        }

        const authenticator = this.buildProviderAuthenticator(entity);

        const state = await this.saveAuthorizationState(event, { link: { userId: identity.id, providerId: entity.id } });

        return { url: authenticator.buildRedirectURL({ state }) };
    }

    @DGet('/:id/authorize-in', [])
    async authorizeIn(
        @DPath('id') _id: string,
        @DContext() event: IAppEvent,
    ) {
        const id = useRequestParamID(event);

        const entity = await this.resolve(id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new Error(`The provider protocol ${entity.protocol} is not valid.`);
        }

        const data = await this.verifyAuthorizationState(event);

        const { link } = data;
        if (link) {
            return this.completeLink(event, entity, data, link);
        }

        // authorize-out no longer mints a login state without a code request;
        // this refuses the ones minted before that (issue #3457).
        if (!data.codeRequest) {
            throw OAuth2RequestError.malformed('The state carries no authorization code request.');
        }

        const { code, error } = useRequestQuery(event);

        // RFC 6749 section 4.1.2.1: a provider answers a refused or failed
        // authorization (the person cancelled at the provider, the provider
        // is down) with `error` and no code. A top-level browser navigation
        // like every other refusal here, so it lands on the hosted login
        // again. Nothing of the provider's answer is echoed: whoever controls
        // the provider's redirect shapes those values.
        if (typeof error === 'string' && error.length > 0) {
            // JSON-quoted: a raw query value must not be able to forge a log line
            this.logger?.info(`The identity provider ${entity.id} answered the authorization with ${JSON.stringify(error.slice(0, 64))}.`);

            return sendRedirect(event, this.buildHostedAuthorizeURL(data.codeRequest).href);
        }

        if (typeof code !== 'string' || code.length === 0) {
            throw new BadRequestError('The authorization code is missing.');
        }

        const result = await this.loginService.complete({
            provider: entity,
            codeRequest: data.codeRequest,
            code,
            loginChallenge: data.loginChallenge ?? '',
            request: {
                ipAddress: getRequestIP(event),
                userAgent: getRequestHeader(event, 'user-agent'),
            },
        });

        // A refusal is a decision the person at the browser has to be told
        // about, and this is a top-level navigation, so it lands on the
        // hosted login rather than in a JSON body (issue #3458). A marker is
        // only attached when the refusal carries one; without it the page
        // re-runs the same verifier over the same request and states the
        // reason itself, so nothing is echoed.
        const url = this.buildHostedAuthorizeURL(result.codeRequest);

        if (result.kind === 'refused') {
            if (result.error) {
                url.searchParams.set('error', result.error);
            }

            return sendRedirect(event, url.href);
        }

        // The RP's code is NOT minted here. The browser goes back to the
        // hosted authorize page carrying the login handle, and that page
        // redeems it and runs the ladder a password login runs (second
        // factor, prompt freshness, consent) before any code exists
        // (plan 094). So a custom-scheme redirect_uri needs no interstitial
        // on this leg either: it is navigated at the end of the ladder,
        // exactly as it is for an interactive login.
        url.searchParams.set('loginHandle', result.loginHandle);
        url.searchParams.set('provider', entity.id);

        return sendRedirect(event, url.href);
    }

    @DPost('/:id/login-complete', [])
    async completeLogin(
        @DPath('id') _id: string,
        @DBody() _data: IdentityProviderLoginCompletePayload,
        @DContext() event: IAppEvent,
    ) : Promise<OAuth2TokenGrantResponse> {
        const id = useRequestParamID(event);

        const body = await readRequestBody(event);
        const handle = isObject(body) ? body.handle : undefined;
        if (typeof handle !== 'string' || handle.length === 0) {
            throw new BadRequestError('The login handle is missing.');
        }

        const challenge = isObject(body) ? body.challenge : undefined;

        return this.loginService.redeem({
            handle,
            challenge: typeof challenge === 'string' ? challenge : '',
            providerId: id,
            request: {
                ipAddress: getRequestIP(event),
                userAgent: getRequestHeader(event, 'user-agent'),
            },
        });
    }

    // ---------------------------------------------------------

    private async write(event: IAppEvent, options: {
        updateOnly?: boolean
    } = {}): Promise<EntityRecordResponse<IdentityProvider>> {
        let group: string;
        const id = getRequestParamID(event, { isUUID: false });
        const body = await readRequestBody(event);
        applyRouteRealmIDToBody(event, body);
        const realmId = getRequestRealmID(event) ?? getBodyRealmID(body);

        let entity: IdentityProvider | null | undefined;
        if (id) {
            const where: Record<string, any> = {};
            if (isUUID(id)) {
                where.id = id;
            } else {
                where.name = id;
            }

            if (realmId) {
                where.realmId = realmId;
            }

            entity = await this.repository.findOneBy(where);
            // Only a NAME key may upsert-create. A UUID addresses one specific
            // row, so a miss is a 404 (creating would write a different id).
            if (!entity && (options.updateOnly || where.id)) {
                throw new EntityNotFoundError();
            }
        } else if (options.updateOnly) {
            throw new EntityNotFoundError();
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
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...data,
                    },
                    [BuiltInPolicyType.REALM_MATCH]: data.realmId ?? entity.realmId ?? null,
                }),
            });
        } else {
            if (!data.realmId) {
                const identity = useRequestIdentityOrFail(event);
                data.realmId = identity.realmId;
            }

            await permissionEvaluator.evaluate({
                name: PermissionName.IDENTITY_PROVIDER_CREATE,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: data, [BuiltInPolicyType.REALM_MATCH]: data.realmId ?? null }),
            });
        }

        await this.repository.checkUniqueness(data, entity || undefined);

        if (entity) {
            entity = this.repository.merge(entity, data);
            await this.repository.saveWithEA(entity, attributes);

            event.response.status = 202;

            return { data: entity, meta: {} };
        }

        entity = this.repository.create(data);
        await this.repository.saveWithEA(entity, attributes);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    // ---------------------------------------------------------

    /**
     * Callback half of the account-linking round-trip (plan 091): the
     * external identity is bound to the state-referenced user instead of
     * running the login path. No auth code and no session is minted; the
     * browser lands back on the account console with a marker param.
     */
    private async completeLink(
        event: IAppEvent,
        provider: OAuth2IdentityProvider | OpenIDIdentityProvider,
        state: OAuth2AuthorizationState,
        link: OAuth2AuthorizationStateLink,
    ) {
        // Fixed, server-derived return target (the account console page).
        // No client-supplied redirect exists on this path.
        const url = new URL(resolveURL(this.options.baseURL, 'account/connected-accounts'));

        const { code } = useRequestQuery(event);

        try {
            // The state is bound to the provider it was minted for, and the
            // provider must still be enabled at completion — a state cannot
            // be replayed against a different provider's callback, nor
            // complete a link after its provider was disabled.
            if (link.providerId !== provider.id || !provider.enabled) {
                throw new BadRequestError('The identity provider is not available for account linking.');
            }

            if (typeof code !== 'string' || code.length === 0) {
                throw new BadRequestError('The authorization code is missing.');
            }

            const authenticator = this.buildProviderAuthenticator(provider);

            const identity = await authenticator.resolveIdentity({ code });

            // A provider answering without a subject has nothing to bind. The
            // callback used to reach `link()`, which rejected it; the stash
            // would otherwise carry an empty providerUserId to the confirm.
            if (!identity.id) {
                throw new BadRequestError('The identity provider returned no subject.');
            }

            // Nothing is written here. This request is unauthenticated — the
            // browser round-trip cannot carry a bearer — so the only thing
            // distinguishing the browser that started the link from any other
            // would be the state's ip / user-agent binding, and both values
            // are chosen by whoever minted the state. An attacker minting a
            // state carrying their OWN userId and getting a victim to follow
            // it would otherwise bind the VICTIM's external identity to the
            // attacker's account (issue #3439).
            //
            // The resolved identity is stashed under a one-time handle
            // instead, and the account console confirms it with its bearer.
            // The stash keeps the requesting userId so the confirm can
            // require it to equal the AUTHENTICATED user: the handle is a
            // URL parameter, so it reaches browser history and proxy logs,
            // and on its own it must authorize nothing.
            const handle = await this.linkStore.save({
                providerId: provider.id,
                userId: link.userId,
                providerUserId: identity.id,
                providerUserName: this.pickIdentityCandidate(identity, 'name'),
                providerUserEmail: this.pickIdentityCandidate(identity, 'email'),
            });

            url.searchParams.set('linkHandle', handle);
            url.searchParams.set('provider', provider.id);
        } catch (e) {
            // The failure is swallowed into a redirect marker, so the log is
            // the only surface it can reach. Without this an unreachable or
            // rejecting provider is indistinguishable from a stale state.
            this.logger?.error(describeError(e, 'The identity-provider account link failed.'));

            url.searchParams.set('linkError', 'link_failed');
        }

        return sendRedirect(event, url.href);
    }

    /**
     * The bearer-authenticated half of the link (issue #3439): the account
     * row is written here, for the AUTHENTICATED user, never in the callback.
     */
    @DPost('/:id/link-confirm', [ForceLoggedInMiddleware])
    async confirmLink(
        @DPath('id') _id: string,
        @DBody() _data: IdentityProviderLinkConfirmPayload,
        @DContext() event: IAppEvent,
    ) : Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const id = useRequestParamID(event);
        const provider = await this.resolve(id);

        if (!isOAuth2IdentityProvider(provider) && !isOpenIDIdentityProvider(provider)) {
            throw new BadRequestError('Only an identity-provider based on the oauth protocol supports account linking.');
        }

        if (!provider.enabled) {
            throw new BadRequestError('The identity provider is not enabled.');
        }

        const identity = useRequestIdentityOrFail(event);
        if (identity.type !== IdentityType.USER) {
            throw new BadRequestError('Only a user can link an identity provider account.');
        }

        const body = await readRequestBody(event);
        const handle = isObject(body) ? body.handle : undefined;
        if (typeof handle !== 'string' || handle.length === 0) {
            throw new BadRequestError('The account link handle is missing.');
        }

        const link = await this.linkStore.consume(handle);
        if (!link) {
            throw new BadRequestError('The account link request is unknown or expired.');
        }

        // The two checks that make the handle inert on its own: it may only
        // be redeemed by the user it was minted for, and only against the
        // provider it was minted for.
        if (link.userId !== identity.id || link.providerId !== provider.id) {
            throw new BadRequestError('The account link request does not belong to the authenticated user.');
        }

        const account = await this.accountManager.link(
            {
                id: link.providerUserId,
                // deliberately rebuilt from the stashed scalars: the resolved
                // identity carries the provider secret and the raw external
                // token payload, neither of which belongs in a cache
                attributeCandidates: {
                    name: [link.providerUserName],
                    email: [link.providerUserEmail],
                },
                data: {},
                provider,
            },
            identity.id,
        );

        // the confirm runs under a bearer, so unlike the callback it CAN be
        // attributed to a session and a route (the unlink emit's shape)
        const requestContext = useRequestEventContext();

        await this.eventService?.record({
            scope: EventScope.IDENTITY,
            name: EventName.IDENTITY_PROVIDER_LINKED,
            refType: EventRefType.IDENTITY_PROVIDER_ACCOUNT,
            refId: account.id,
            realmId: account.userRealmId ?? provider.realmId ?? null,
            actorType: IdentityType.USER,
            actorId: account.userId,
            actorName: identity.data.name ?? null,
            sessionId: requestContext?.sessionId ?? null,
            requestPath: requestContext?.requestPath ?? null,
            requestMethod: requestContext?.requestMethod ?? null,
            requestIpAddress: requestContext?.requestIpAddress ?? getRequestIP(event) ?? null,
            requestUserAgent: requestContext?.requestUserAgent ?? getRequestHeader(event, 'user-agent') ?? null,
            data: { providerId: provider.id, providerName: provider.name },
        });

        return { data: account, meta: {} };
    }

    private pickIdentityCandidate(
        identity: IdentityProviderIdentity,
        key: 'name' | 'email',
    ) : string | null {
        const candidates = identity.attributeCandidates?.[key] || [];
        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.length > 0) {
                return candidate;
            }
        }

        return null;
    }

    // ---------------------------------------------------------

    private buildHostedAuthorizeURL(codeRequest: OAuth2AuthorizationCodeRequest): URL {
        const url = new URL(resolveURL(this.options.baseURL, 'authorize'));

        const codeRequestKeys = Object.keys(codeRequest);
        for (const codeRequestKey_ of codeRequestKeys) {
            const codeRequestKey = codeRequestKey_ as keyof OAuth2AuthorizationCodeRequest;
            const codeRequestValue = codeRequest[codeRequestKey];
            // Preserve meaningful falsy values (e.g. max_age=0, which OIDC
            // treats as prompt=login) — only skip absent ones.
            if (typeof codeRequestValue !== 'undefined' && codeRequestValue !== null) {
                url.searchParams.set(codeRequestKey, String(codeRequestValue));
            }
        }

        return url;
    }

    // ---------------------------------------------------------

    private async resolve(id: string) {
        const entity = await this.repository.findOneById(id);

        if (!entity) {
            throw new EntityNotFoundError();
        }

        return entity;
    }

    // ---------------------------------------------------------

    private buildProviderAuthenticator(
        provider: OAuth2IdentityProvider | OpenIDIdentityProvider,
        options: { clientId?: string } = {},
    ) {
        return createIdentityProviderOAuth2Authenticator({
            accountManager: this.accountManager,
            provider,
            logger: this.logger,
            options: {
                baseURL: this.options.baseURL,
                clientId: options.clientId,
            },
        });
    }

    private async saveAuthorizationState(
        event: IAppEvent,
        data: Pick<OAuth2AuthorizationState, 'codeRequest' | 'link' | 'loginChallenge'> = {},
    ) : Promise<string> {
        return this.stateManager.save({
            ...data,
            ip: getRequestIP(event) ?? '',
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }

    private async verifyAuthorizationState(event: IAppEvent): Promise<OAuth2AuthorizationState> {
        const query = useRequestQuery(event);
        if (typeof query.state !== 'string') {
            throw OAuth2RequestError.stateInvalid();
        }

        return this.stateManager.verify(query.state, {
            ip: getRequestIP(event) ?? '',
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }
}
