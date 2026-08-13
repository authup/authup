/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { ValidatorGroup, base64URLDecode, isUUID } from '@authup/kit';
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
    SessionAuthMethod,
    isOAuth2IdentityProvider,
    isOpenIDIdentityProvider,
} from '@authup/core-kit';
import { BadRequestError, EntityInactiveError, EntityNotFoundError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import { describeError, resolveURL } from '../../../../../utils/index.ts';
import { useRequestQuery } from '@routup/basic/query';
import { readRequestBody } from '@routup/basic/body';
import { OAuth2ErrorCode, OAuth2RequestError } from '@authup/specs';
import type {
    EntityCollectionResponse,
    EntityRecordResponse,
    IdentityProviderCreatePayload,
    IdentityProviderLinkRequestResponse,
    IdentityProviderSavePayload,
    IdentityProviderUpdatePayload,
} from '@authup/core-http-kit';
import { URL } from 'node:url';
import type {
    IEventService,
    IIdentityProviderAccountManager,
    IIdentityProviderRepository,
    IOAuth2AccessPolicyEvaluator,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IRealmRepository,
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
    isIdentityProviderAccountAlreadyLinkedError,
    toIdentityPolicyData,
} from '../../../../../core/index.ts';
import {
    applyRouteRealmIDToBody,
    buildActorContext,
    getBodyRealmID,
    getRequestParamID,
    getRequestRealmID,
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

    protected realmRepository: IRealmRepository;

    protected accountManager: IIdentityProviderAccountManager;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : OAuth2AuthorizationCodeRequestValidator;

    protected stateManager : IOAuth2AuthorizationStateManager;

    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    protected accessPolicyEvaluator? : IOAuth2AccessPolicyEvaluator;

    protected eventService? : IEventService;

    protected logger? : Logger;

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
        this.accessPolicyEvaluator = ctx.accessPolicyEvaluator;
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

        const authenticator = this.buildProviderAuthenticator(entity);

        let codeRequest: OAuth2AuthorizationCodeRequest | undefined;
        const query = useRequestQuery(event);
        if (typeof query.codeRequest === 'string') {
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

            codeRequest = data.data;
        }

        const state = await this.saveAuthorizationState(event, { codeRequest });

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

        if (
            entity.realmId &&
            data.codeRequest &&
            data.codeRequest.realm_id &&
            data.codeRequest.realm_id !== entity.realmId
        ) {
            throw OAuth2RequestError.malformed('The provider and client realm do not match.');
        }

        const { code } = useRequestQuery(event);

        if (typeof code !== 'string' || code.length === 0) {
            throw new BadRequestError('The authorization code is missing.');
        }

        // Re-verify the code request that authorize-out stored on the state,
        // BEFORE the provider's single-use code is spent. It re-resolves the
        // client (active, grant allowlist, scopes) and re-matches the
        // redirect_uri against the client's registered patterns, so a client
        // deactivated (or a pattern removed) while the user was away at the
        // provider cannot still receive a code, and a refused completion
        // provisions no user. Same fail-closed-at-completion rule the link path
        // applies to the provider.
        //
        // The redirect below rests on the MATCH, which the verifier enforces by
        // throwing `redirectUriMismatch`; `redirectUriVerified` is the flag
        // that survives to report it. Nothing else on this path knows whether
        // the uri was ever matched.
        const verified = data.codeRequest ?
            await this.codeRequestVerifier.verify(data.codeRequest) :
            undefined;

        // The provider must still be enabled, the rule the link path already
        // applies. Disabling a provider has to stop logins in flight too,
        // otherwise it only stops new ones.
        if (!entity.enabled) {
            throw new BadRequestError('The identity provider is not enabled.');
        }

        const authenticator = this.buildProviderAuthenticator(entity, { clientId: verified?.data.client_id });

        const user = await authenticator.authenticate({ code });

        // The local login path refuses an inactive user (EntityInactiveError),
        // and a federated login must not be the way around that. Only reachable
        // for an already-linked user: a first login provisions an active one.
        if (!user.active) {
            throw new EntityInactiveError({ entity: 'user' });
        }

        const realm = await this.realmRepository.resolve(entity.realmId, true);

        // Application access policy (plan 052), federated leg. The denial
        // bounces back to the hosted authorize page, which renders it as a
        // denial card, rather than becoming an error redirect to the RP: the
        // person is standing in front of the browser and the card is the only
        // surface that can tell them why. A policy id with no wired evaluator
        // denies (fail closed).
        if (verified?.client.accessPolicyId) {
            let allowed = false;

            const subject = toIdentityPolicyData({
                type: IdentityType.USER,
                data: {
                    ...user,
                    realm,
                },
            });
            if (this.accessPolicyEvaluator && subject) {
                allowed = await this.accessPolicyEvaluator.evaluate(
                    verified.client.accessPolicyId,
                    subject,
                );
            }

            if (!allowed) {
                const url = this.buildHostedAuthorizeURL(verified.data);
                url.searchParams.set('error', OAuth2ErrorCode.ACCESS_DENIED);

                return sendRedirect(event, url.href);
            }
        }

        // The WHOLE verified request reaches the issuer, never a hand-picked
        // subset: it carries code_challenge / code_challenge_method and nonce
        // (plus acr_values, which no redemption path reads yet). A code that
        // lost its PKCE challenge cannot be redeemed by a public client at all
        // (`PKCE is required for public clients`), which is every console
        // client.
        const authorizationCode = await this.codeIssuer.issue(
            verified?.data ?? { response_type: 'code' },
            {
                type: IdentityType.USER,
                data: {
                    ...user,
                    realm,
                },
            },
            { authMethod: SessionAuthMethod.EXTERNAL },
        );

        // The interactive path records this in OAuth2Authorization.authorize();
        // this leg issues its code directly, so without an emit here a
        // federated authorization leaves no trace in auth_events while every
        // other one does. `reason: federated` is what tells the two apart:
        // there was no consent step to report. No session exists yet (the
        // /token exchange creates it), hence a null sessionId. Metrics stay
        // uninstrumented on this leg, as they already are.
        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.AUTHORIZE,
            refType: EventRefType.CLIENT,
            refId: verified?.data.client_id ?? null,
            clientId: verified?.data.client_id ?? null,
            sessionId: null,
            actorType: IdentityType.USER,
            actorId: user.id,
            actorName: user.name,
            realmId: verified?.data.realm_id ?? realm.id,
            requestIpAddress: getRequestIP(event) ?? null,
            requestUserAgent: getRequestHeader(event, 'user-agent') ?? null,
            data: {
                reason: 'federated',
                providerId: entity.id,
                providerName: entity.name,
                ...(verified?.data.scope ? { scope: verified.data.scope } : {}),
            },
        });

        // RFC 6749 §4.1.2: the code goes back to the client that asked for it.
        // It is bound to that client_id and that redirect_uri, so the RP is the
        // only party able to redeem it. Handing it to any other page strands
        // the login there (issue #3446).
        if (verified?.redirectUriVerified && verified.data.redirect_uri) {
            const url = new URL(verified.data.redirect_uri);
            url.searchParams.set('code', authorizationCode.id);
            if (verified.data.state) {
                url.searchParams.set('state', verified.data.state);
            }

            return sendRedirect(event, url.href);
        }

        // Only reachable when the state carried no code request at all: a
        // stored one always has a redirect_uri, because that mount is required
        // in OAuth2AuthorizationCodeRequestValidator (unlike `state`), so a
        // verified request is always a verified redirect target.
        const url = new URL(this.options.baseURL);
        url.searchParams.set('code', authorizationCode.id);

        return sendRedirect(event, url.href);
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

            // The state must be bound to the browser that minted it. Both
            // bindings come from the minting request itself
            // (`saveAuthorizationState` stores its ip and user-agent) and
            // `OAuth2AuthorizationStateManager.verify` skips a check whose
            // STORED value is falsy, so an absent binding is a choice the
            // minter made rather than a property of the network — and it
            // leaves the state completable in any browser.
            //
            // On the login path that is a session-fixation nuisance. Here it
            // is a durable credential binding: an attacker who mints a state
            // carrying their OWN userId and gets a victim to follow it binds
            // the VICTIM's external identity to the attacker's account, and
            // the victim's next federated login then lands in it. Refuse an
            // unbound state instead of linking on it.
            //
            // This closes the absent-binding hole only. ip + user-agent
            // remain guessable, and with the shipped `trustProxy: true` the
            // ip is the client-supplied left-most X-Forwarded-For entry, so
            // this is a stopgap: see issue #3439 for moving the write behind
            // a bearer-authenticated confirmation.
            if (!state.ip || !state.userAgent) {
                throw new BadRequestError('The account link request is not bound to a browser.');
            }

            if (typeof code !== 'string' || code.length === 0) {
                throw new BadRequestError('The authorization code is missing.');
            }

            const authenticator = this.buildProviderAuthenticator(provider);

            const identity = await authenticator.resolveIdentity({ code });
            const account = await this.accountManager.link(identity, link.userId);

            await this.eventService?.record({
                scope: EventScope.IDENTITY,
                name: EventName.IDENTITY_PROVIDER_LINKED,
                refType: EventRefType.IDENTITY_PROVIDER_ACCOUNT,
                refId: account.id,
                realmId: account.userRealmId ?? provider.realmId ?? null,
                actorType: IdentityType.USER,
                actorId: account.userId,
                requestIpAddress: getRequestIP(event) ?? null,
                requestUserAgent: getRequestHeader(event, 'user-agent') ?? null,
                data: { providerId: provider.id, providerName: provider.name },
            });

            url.searchParams.set('linked', provider.id);
        } catch (e) {
            // The failure is swallowed into a redirect marker, so the log is
            // the only surface it can reach. Without this an unreachable or
            // rejecting provider is indistinguishable from a stale state.
            this.logger?.error(describeError(e, 'The identity-provider account link failed.'));

            url.searchParams.set(
                'linkError',
                isIdentityProviderAccountAlreadyLinkedError(e) ? 'already_linked' : 'link_failed',
            );
        }

        return sendRedirect(event, url.href);
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
            options: {
                baseURL: this.options.baseURL,
                clientId: options.clientId,
            },
        });
    }

    private async saveAuthorizationState(
        event: IAppEvent,
        data: Pick<OAuth2AuthorizationState, 'codeRequest' | 'link'> = {},
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
