/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomBytes } from 'node:crypto';
import type { Client, Identity, Realm } from '@authup/core-kit';
import { EventName, EventRefType, EventScope } from '@authup/core-kit';
import type { DeviceAuthorizationInfo, OAuth2DeviceAuthorizationResponse } from '@authup/core-http-kit';
import { DeviceVerificationThrottledError, hasInstanceof } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import {
    OAUTH2_LOGIN_REQUIRED_ERROR_INSTANCE,
    OAuth2GrantError,
    OAuth2LoginRequiredError,
    OAuth2ServerError,
    OAuth2SubKind,
    OAuth2TokenGrant,
    isOAuth2AccessDeniedError,
} from '@authup/specs';
import { classifyAuthorizeFailure } from '../authorization/helpers.ts';
import type { IOAuth2AuthorizationGate, OAuth2AuthorizationGateResult } from '../authorization/types.ts';
import type { IOAuth2ClientRepository } from '../client/types.ts';
import { resolveGrantedScope } from '../scope/helpers.ts';
import type { IOAuth2ScopeRepository } from '../scope/types.ts';
import type { 
    EventRecordInput, 
    EventRequestContext, 
    IConsentService, 
    IEventService, 
} from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import {
    OAUTH2_DEVICE_CODE_INTERVAL,
    OAUTH2_DEVICE_CODE_MAX_AGE,
    OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR,
    OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW,
    OAUTH2_DEVICE_USER_CODE_MINT_ATTEMPTS,
} from './constants.ts';
import { OAuth2DeviceCodeStatus } from './types.ts';
import type {
    IOAuth2DeviceAuthorizationService,
    IOAuth2DeviceCodeRepository,
    OAuth2DeviceAuthorizationApproveOptions,
    OAuth2DeviceAuthorizationIssueOptions,
    OAuth2DeviceAuthorizationServiceContext,
    OAuth2DeviceAuthorizationServiceOptions,
    OAuth2DeviceCode,
} from './types.ts';
import { formatDeviceUserCode, generateDeviceUserCode, normalizeDeviceUserCode } from './user-code.ts';

const USER_CODE_INVALID_MESSAGE = 'The code is invalid or has expired.';

type ResolvedDeviceCode = {
    code: OAuth2DeviceCode,
    client: Client,
};

export class OAuth2DeviceAuthorizationService implements IOAuth2DeviceAuthorizationService {
    protected repository : IOAuth2DeviceCodeRepository;

    protected clientRepository : IOAuth2ClientRepository;

    protected scopeRepository : IOAuth2ScopeRepository;

    protected gate : IOAuth2AuthorizationGate;

    protected consentService? : IConsentService;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    protected logger? : Logger;

    protected requestContext? : () => EventRequestContext | undefined;

    protected options : OAuth2DeviceAuthorizationServiceOptions;

    constructor(ctx: OAuth2DeviceAuthorizationServiceContext) {
        this.repository = ctx.repository;
        this.clientRepository = ctx.clientRepository;
        this.scopeRepository = ctx.scopeRepository;
        this.gate = ctx.gate;
        this.consentService = ctx.consentService;
        this.eventService = ctx.eventService;
        this.metrics = ctx.metrics;
        this.logger = ctx.logger;
        this.requestContext = ctx.requestContext;
        this.options = ctx.options;
    }

    async issue(
        client: Client,
        realm: Realm,
        options: OAuth2DeviceAuthorizationIssueOptions,
    ) : Promise<OAuth2DeviceAuthorizationResponse> {
        const scopes = await this.scopeRepository.findByClientId(client.id);
        const scope = resolveGrantedScope(scopes.map((entry) => entry.name), options.scope);

        for (let attempt = 0; attempt < OAUTH2_DEVICE_USER_CODE_MINT_ATTEMPTS; attempt++) {
            const id = randomBytes(32).toString('hex');
            const userCode = generateDeviceUserCode();

            const saved = await this.repository.save({
                id,
                user_code: userCode,
                client_id: client.id,
                realm_id: client.realmId,
                realm_name: realm.name,
                scope,
                expires_at: Math.floor(Date.now() / 1000) + OAUTH2_DEVICE_CODE_MAX_AGE,
            });

            if (saved) {
                const formatted = formatDeviceUserCode(userCode);

                return {
                    device_code: id,
                    user_code: formatted,
                    verification_uri: this.options.verificationUri,
                    verification_uri_complete: `${this.options.verificationUri}?user_code=${formatted}`,
                    expires_in: OAUTH2_DEVICE_CODE_MAX_AGE,
                    interval: OAUTH2_DEVICE_CODE_INTERVAL,
                };
            }
        }

        throw new OAuth2ServerError({ message: 'A device code could not be allocated.' });
    }

    async lookup(userCode: unknown, identity: Identity) : Promise<DeviceAuthorizationInfo> {
        const { code, client } = await this.resolve(userCode, identity);

        return {
            client: {
                id: client.id,
                name: client.name,
                displayName: client.displayName,
                builtIn: client.builtIn,
                createdAt: client.createdAt,
            },
            realm: {
                id: client.realm.id,
                name: client.realm.name,
                displayName: client.realm.displayName,
            },
            scope: code.scope,
        };
    }

    async approve(
        userCode: unknown,
        identity: Identity,
        options: OAuth2DeviceAuthorizationApproveOptions,
    ) : Promise<void> {
        const { code, client } = await this.resolveForDecision(userCode, identity);

        let result : OAuth2AuthorizationGateResult;
        try {
            result = await this.gate.evaluate({ realm_id: code.realm_id }, identity, {
                sessionId: options.sessionId,
                client,
            });
        } catch (e) {
            if (isOAuth2AccessDeniedError(e)) {
                await this.eventService?.record({
                    ...this.buildClientAttribution(EventName.AUTHORIZE_FAILED, code, client, identity),
                    data: { reason: 'accessPolicy', grantType: OAuth2TokenGrant.DEVICE_CODE },
                });
            }
            this.metrics?.recordAuthorize(classifyAuthorizeFailure(e));

            throw e;
        }

        const claimed = await this.repository.decide(code.id, {
            status: OAuth2DeviceCodeStatus.APPROVED,
            sub: identity.data.id,
            sub_kind: OAuth2SubKind.USER,
            session_id: options.sessionId ?? null,
            auth_time: result.authTime,
            auth_method: result.session?.authMethod ?? null,
        }, code.expires_at);
        if (!claimed) {
            throw OAuth2GrantError.invalid(USER_CODE_INVALID_MESSAGE);
        }

        await this.repository.removeUserCode(code.user_code);
        await this.repository.resetLookupMisses(this.buildActorKey(identity));

        if (!client.builtIn && this.consentService) {
            try {
                await this.consentService.record({
                    clientId: client.id,
                    realmId: client.realmId,
                    owner: {
                        sub: identity.data.id,
                        subKind: identity.type,
                    },
                    scope: code.scope,
                });
            } catch (e) {
                this.logger?.warn('Recording the OAuth2 consent grant failed.', {
                    clientId: client.id,
                    error: e,
                });
            }
        }

        await this.eventService?.record({
            ...this.buildClientAttribution(EventName.AUTHORIZE, code, client, identity),
            data: {
                reason: 'device', 
                grantType: OAuth2TokenGrant.DEVICE_CODE, 
                scope: code.scope, 
            },
        });
        this.metrics?.recordAuthorize('issued');
    }

    async deny(userCode: unknown, identity: Identity) : Promise<void> {
        const { code, client } = await this.resolveForDecision(userCode, identity);

        const claimed = await this.repository.decide(code.id, { status: OAuth2DeviceCodeStatus.DENIED }, code.expires_at);
        if (!claimed) {
            throw OAuth2GrantError.invalid(USER_CODE_INVALID_MESSAGE);
        }

        await this.repository.removeUserCode(code.user_code);
        await this.repository.resetLookupMisses(this.buildActorKey(identity));

        await this.eventService?.record({
            ...this.buildClientAttribution(EventName.AUTHORIZE_FAILED, code, client, identity),
            data: {
                reason: 'denied', 
                grantType: OAuth2TokenGrant.DEVICE_CODE, 
                scope: code.scope, 
            },
        });
        this.metrics?.recordAuthorize('denied');
    }

    /**
     * `resolve` for the two DECISION methods. A foreign-realm refusal is an authorize
     * outcome and is counted here; `lookup` is a page render — the device analogue of
     * the `/authorize` GET, which records nothing either — so it must not contribute to
     * `authup_authorize_total`, whose other outcomes it can never produce. Shared rather
     * than duplicated per method: the guard existing on `approve` and not on `deny` IS
     * issue #3591.
     */
    protected async resolveForDecision(userCode: unknown, identity: Identity) : Promise<ResolvedDeviceCode> {
        try {
            return await this.resolve(userCode, identity);
        } catch (e) {
            if (hasInstanceof(e, OAUTH2_LOGIN_REQUIRED_ERROR_INSTANCE)) {
                this.metrics?.recordAuthorize('login_required');
            }

            throw e;
        }
    }

    protected async resolve(userCode: unknown, identity: Identity) : Promise<ResolvedDeviceCode> {
        const actorKey = this.buildActorKey(identity);

        let retryAfter : number | null;
        try {
            retryAfter = await this.repository.lookupThrottle(actorKey);
        } catch {
            throw new DeviceVerificationThrottledError({ retryAfter: OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW });
        }

        if (retryAfter !== null) {
            throw new DeviceVerificationThrottledError({ retryAfter });
        }

        const canonical = typeof userCode === 'string' ? normalizeDeviceUserCode(userCode) : null;
        const code = canonical ? await this.repository.findOneByUserCode(canonical) : null;
        const client = code ? await this.clientRepository.findOneByIdOrName(code.client_id, code.realm_id) : null;
        const now = Math.floor(Date.now() / 1000);

        if (
            !code ||
            !client ||
            !client.active ||
            code.status !== OAuth2DeviceCodeStatus.PENDING ||
            code.expires_at <= now
        ) {
            await this.repository.countLookupMiss(actorKey, OAUTH2_DEVICE_LOOKUP_ATTEMPTS_PER_ACTOR);

            await this.eventService?.record({
                scope: EventScope.OAUTH2,
                name: EventName.AUTHORIZE_FAILED,
                refId: null,
                actorType: identity.type,
                actorId: identity.data.id,
                actorName: identity.data.name,
                realmId: identity.data.realmId ?? null,
                ...this.buildRequestAttribution(),
                data: { reason: 'userCode', grantType: OAuth2TokenGrant.DEVICE_CODE },
            });

            throw OAuth2GrantError.invalid(USER_CODE_INVALID_MESSAGE);
        }

        if (identity.data.realmId !== code.realm_id) {
            throw OAuth2LoginRequiredError.realmMismatch();
        }

        return { code, client };
    }

    protected buildActorKey(identity: Identity) : string {
        return `actor:${identity.data.id}`;
    }

    protected buildClientAttribution(
        name: `${EventName}`,
        code: OAuth2DeviceCode,
        client: Client,
        identity: Identity,
    ) : EventRecordInput {
        return {
            scope: EventScope.OAUTH2,
            name,
            refType: EventRefType.CLIENT,
            refId: client.id,
            clientId: client.id,
            realmId: code.realm_id,
            actorType: identity.type,
            actorId: identity.data.id,
            actorName: identity.data.name,
            ...this.buildRequestAttribution(),
        };
    }

    protected buildRequestAttribution() : Pick<
        EventRecordInput,
    'sessionId' | 'requestPath' | 'requestMethod' | 'requestIpAddress' | 'requestUserAgent'
    > {
        const request = this.requestContext?.();

        return {
            sessionId: request?.sessionId ?? null,
            requestPath: request?.requestPath ?? null,
            requestMethod: request?.requestMethod ?? null,
            requestIpAddress: request?.requestIpAddress ?? null,
            requestUserAgent: request?.requestUserAgent ?? null,
        };
    }
}
