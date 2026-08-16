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
    isSafeRedirectURLScheme,
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
    SessionAuthMethod,
    buildIdentityProviderAuthorizeCallbackPath,
    isOAuth2IdentityProvider,
    isOpenIDIdentityProvider,
} from '@authup/core-kit';
import { BadRequestError, EntityNotFoundError, InternalError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import { describeError, resolveURL } from '../../../../../utils/index.ts';
import { useRequestQuery } from '@routup/basic/query';
import { readRequestBody } from '@routup/basic/body';
import { OAuth2ErrorCode, OAuth2RequestError, isOAuth2Error } from '@authup/specs';
import type {
    EntityCollectionResponse,
    EntityRecordResponse,
    IdentityProviderCreatePayload,
    IdentityProviderLinkConfirmPayload,
    IdentityProviderLinkRequestResponse,
    IdentityProviderSavePayload,
    IdentityProviderUpdatePayload,
} from '@authup/core-http-kit';
import { URL } from 'node:url';
import type {
    IEventService,
    IIdentityProviderAccountLinkStore,
    IIdentityProviderAccountManager,
    IIdentityProviderRepository,
    IOAuth2AccessPolicyEvaluator,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IRealmRepository,
    IdentityProviderIdentity,
    OAuth2AuthorizationCodeRequestVerificationResult,
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
    toIdentityPolicyData,
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
import type { IdentityProviderCallbackPayload } from '@authup/client-auth-console';
import { renderAuthConsolePage } from '../../../ui/index.ts';
import type { IdentityProviderControllerContext, IdentityProviderControllerOptions } from './types.ts';

@DTags('identity')
@DController(['/identity-providers', '/realms/:realmId/identity-providers'])
export class IdentityProviderController {
    protected options: IdentityProviderControllerOptions;

    protected repository: IIdentityProviderRepository;

    protected realmRepository: IRealmRepository;

    protected accountManager: IIdentityProviderAccountManager;

    protected linkStore: IIdentityProviderAccountLinkStore;

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
        this.linkStore = ctx.linkStore;
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

        const state = await this.saveAuthorizationState(event, { codeRequest: data.data });

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

        if (
            entity.realmId &&
            data.codeRequest.realm_id &&
            data.codeRequest.realm_id !== entity.realmId
        ) {
            throw OAuth2RequestError.malformed('The provider and client realm do not match.');
        }

        const { code, error } = useRequestQuery(event);

        // RFC 6749 section 4.1.2.1: a provider answers a refused or failed
        // authorization (the person cancelled at the provider, the provider
        // is down) with `error` and no code. A top-level browser navigation
        // like every other refusal here, so it lands on the hosted login
        // again. Nothing of the provider's answer is echoed: whoever controls
        // the provider's redirect shapes those values.
        if (typeof error === 'string' && error.length > 0) {
            this.logger?.info(`The identity provider ${entity.id} answered the authorization with: ${error.slice(0, 64)}`);

            return sendRedirect(event, this.buildHostedAuthorizeURL(data.codeRequest).href);
        }

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
        //
        // This is a top-level browser navigation, so a refusal has to land on
        // a page rather than a JSON body (issue #3458). The hosted authorize
        // page re-runs this verifier on the same code request and renders the
        // same refusal, so the bounce carries no marker and echoes nothing.
        // A server failure is not a refusal and keeps throwing.
        let verified : OAuth2AuthorizationCodeRequestVerificationResult;
        try {
            verified = await this.codeRequestVerifier.verify(data.codeRequest);
        } catch (e) {
            if (!isOAuth2Error(e)) {
                throw e;
            }

            return sendRedirect(event, this.buildHostedAuthorizeURL(data.codeRequest).href);
        }

        // A stored code request always carries a redirect_uri (that mount is
        // required in OAuth2AuthorizationCodeRequestValidator, unlike
        // `state`), so a verified request is a verified redirect target. The
        // guard keeps the redirect decision resting on the match itself.
        const redirectUri = verified.data.redirect_uri;
        if (!verified.redirectUriVerified || !redirectUri) {
            throw OAuth2RequestError.malformed('The redirect_uri was not verified.');
        }

        // A non-http(s) target is navigated from the interstitial page below,
        // which `location.assign`s it and renders it as an href, so a
        // script-capable scheme would execute on the IdP origin. The client
        // validator and the code-request verifier both refuse such a scheme;
        // this guard fails closed should either gap, and it runs here, before
        // the provider's single-use code is spent, a user provisioned or a
        // code minted.
        if (!isSafeRedirectURLScheme(redirectUri)) {
            throw new InternalError('The redirect_uri scheme is not allowed.');
        }

        // The provider must still be enabled, the rule the link path already
        // applies. Disabling a provider has to stop logins in flight too,
        // otherwise it only stops new ones. The hosted page maps the marker
        // onto a neutral "provider not available" error.
        if (!entity.enabled) {
            const url = this.buildHostedAuthorizeURL(verified.data);
            url.searchParams.set('error', OAuth2ErrorCode.LOGIN_REQUIRED);

            return sendRedirect(event, url.href);
        }

        const authenticator = this.buildProviderAuthenticator(entity, { clientId: verified.data.client_id });

        const user = await authenticator.authenticate({ code });

        // The local login path refuses an inactive user (EntityInactiveError),
        // and a federated login must not be the way around that. Only reachable
        // for an already-linked user: a first login provisions an active one.
        // Bounced as a denial, like the access policy below.
        if (!user.active) {
            const url = this.buildHostedAuthorizeURL(verified.data);
            url.searchParams.set('error', OAuth2ErrorCode.ACCESS_DENIED);

            return sendRedirect(event, url.href);
        }

        const realm = await this.realmRepository.resolve(entity.realmId, true);

        // Application access policy (plan 052), federated leg. The denial
        // bounces back to the hosted authorize page, which renders it as a
        // denial card, rather than becoming an error redirect to the RP: the
        // person is standing in front of the browser and the card is the only
        // surface that can tell them why. A policy id with no wired evaluator
        // denies (fail closed).
        if (verified.client.accessPolicyId) {
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
            verified.data,
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
            refId: verified.data.client_id ?? null,
            clientId: verified.data.client_id ?? null,
            sessionId: null,
            actorType: IdentityType.USER,
            actorId: user.id,
            actorName: user.name,
            realmId: verified.data.realm_id ?? realm.id,
            requestIpAddress: getRequestIP(event) ?? null,
            requestUserAgent: getRequestHeader(event, 'user-agent') ?? null,
            data: {
                reason: 'federated',
                providerId: entity.id,
                providerName: entity.name,
                ...(verified.data.scope ? { scope: verified.data.scope } : {}),
            },
        });

        // RFC 6749 §4.1.2: the code goes back to the client that asked for it.
        // It is bound to that client_id and that redirect_uri, so the RP is the
        // only party able to redeem it. Handing it to any other page strands
        // the login there (issue #3446).
        const url = new URL(redirectUri);
        url.searchParams.set('code', authorizationCode.id);
        if (verified.data.state) {
            url.searchParams.set('state', verified.data.state);
        }

        if (url.protocol === 'http:' || url.protocol === 'https:') {
            return sendRedirect(event, url.href);
        }

        // routup's sendRedirect allows http(s) only. A native app's
        // custom-scheme redirect_uri (RFC 8252, matched verbatim by
        // isSimpleURLMatch) is navigated client-side from an interstitial
        // page instead; the target is the verified redirect_uri and nothing
        // else (its scheme was checked above), so the page never reaches an
        // unverified one (issue #3459).
        const payload : IdentityProviderCallbackPayload = {
            redirect: url.href,
            // The browser stays on the consumed callback URL, so a reload
            // would re-run the callback against a popped state. The page
            // swaps the history entry for this first, so a reload lands on
            // the hosted login instead.
            authorizeUrl: this.buildHostedAuthorizeURL(verified.data).href,
            client: {
                id: verified.client.id,
                name: verified.client.name,
                displayName: verified.client.displayName,
            },
        };

        return renderAuthConsolePage(event, {
            url: buildIdentityProviderAuthorizeCallbackPath(entity.id),
            payload: {
                config: { baseURL: this.options.baseURL },
                data: payload,
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
