/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import {
    CLIENT_TOKEN_EXCHANGE_AUDIENCE_MAX_LENGTH,
    ClientTokenExchangeRealmScope,
    EventName,
    EventRefType,
    EventScope,
    IdentityType,
} from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import {
    OAuth2GrantError,
    OAuth2SubKind,
    OAuth2TargetError,
    OAuth2TokenGrant,
    OAuth2TokenKind,
    OAuth2TokenTypeIdentifier,
    isJWTError,
} from '@authup/specs';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IClientTokenExchangeCapabilityRepository, IEventService } from '../../entities/index.ts';
import type { IIdentityResolver } from '../../identity/resolver/types.ts';
import type { IOAuth2TokenIssuer, IOAuth2TokenVerifier } from '../token/index.ts';
import { isTokenSession, isTokenSubjectActive } from '../token/subject.ts';
import type {
    OAuth2GrantRunWIthOptions,
    OAuth2TokenExchangeDecision,
    OAuth2TokenExchangeGrantContext,
    OAuth2TokenExchangeInput,
    OAuth2TokenExchangeSubject,
} from './types.ts';

/**
 * A value no stored audience can be, which a dialect would otherwise refuse to
 * bind (a NUL byte on postgres) or match by padding (trailing space on mysql).
 */
function isMatchableAudience(audience: string) : boolean {
    return audience.length <= CLIENT_TOKEN_EXCHANGE_AUDIENCE_MAX_LENGTH &&
        !/\s/.test(audience) &&
        !audience.includes('\0');
}

/**
 * Delegation, not impersonation: the actor never becomes the subject, gets no
 * session and is named in the issued token. Split in two so the caller can
 * apply the application access policy between the decision and the signature.
 */
export class OAuth2TokenExchangeGrant {
    protected capabilityTokenIssuer : IOAuth2TokenIssuer;

    protected capabilityRepository : Pick<IClientTokenExchangeCapabilityRepository, 'findOneBy'>;

    protected tokenVerifier : IOAuth2TokenVerifier;

    protected sessionManager : ISessionManager;

    protected identityResolver : IIdentityResolver;

    protected eventService? : IEventService;

    constructor(ctx: OAuth2TokenExchangeGrantContext) {
        this.capabilityTokenIssuer = ctx.capabilityTokenIssuer;
        this.capabilityRepository = ctx.capabilityRepository;
        this.tokenVerifier = ctx.tokenVerifier;
        this.sessionManager = ctx.sessionManager;
        this.identityResolver = ctx.identityResolver;
        this.eventService = ctx.eventService;
    }

    /**
     * @throws OAuth2TargetError
     * @throws OAuth2GrantError
     */
    async authorize(input: OAuth2TokenExchangeInput) : Promise<OAuth2TokenExchangeDecision> {
        const entry = await this.resolveEntry(input);

        const subject = await this.verifySubjectToken(input.subjectToken);

        if (
            entry.realmScope !== ClientTokenExchangeRealmScope.ANY &&
            input.client.realmId !== subject.realm_id
        ) {
            throw OAuth2GrantError.invalid('The subject belongs to a realm this client may not delegate for.');
        }

        // The actor presenting the token is not the holder the binding names,
        // so the binding cannot be checked.
        if (typeof subject.cnf !== 'undefined') {
            throw OAuth2GrantError.invalid('A certificate-bound subject token cannot be exchanged.');
        }

        return {
            client: input.client,
            audience: input.audience,
            capabilities: input.capabilities.map((capability) => capability.value),
            lifetime: Math.min(input.expiresIn ?? entry.maxAge, entry.maxAge),
            subject,
        };
    }

    async issue(
        decision: OAuth2TokenExchangeDecision,
        options: OAuth2GrantRunWIthOptions = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        const {
            client,
            audience,
            capabilities,
            lifetime,
            subject,
        } = decision;

        const [token, payload] = await this.capabilityTokenIssuer.issue({
            sub: subject.sub,
            sub_kind: subject.sub_kind,
            realm_id: subject.realm_id,
            ...(subject.realm_name ? { realm_name: subject.realm_name } : {}),
            aud: audience,
            cap: capabilities,
            act: { sub: client.id, sub_kind: OAuth2SubKind.CLIENT },
            client_id: client.id,
            exp: Math.floor(Date.now() / 1000) + lifetime,
        });

        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.TOKEN_EXCHANGED,
            refType: EventRefType.CLIENT,
            refId: client.id,
            clientId: client.id,
            actorType: IdentityType.CLIENT,
            actorId: client.id,
            actorName: client.name,
            realmId: subject.realm_id,
            requestIpAddress: options.ipAddress ?? null,
            requestUserAgent: options.userAgent ?? null,
            data: {
                grantType: OAuth2TokenGrant.TOKEN_EXCHANGE,
                subjectId: subject.sub,
                subjectKind: subject.sub_kind,
                realmName: subject.realm_name,
                audience,
                capabilities: capabilities.join(' '),
                lifetime,
                jti: payload.jti,
            },
        });

        return {
            access_token: token,
            issued_token_type: OAuth2TokenTypeIdentifier.JWT,
            token_type: 'Bearer',
            expires_in: lifetime,
        };
    }

    protected async resolveEntry(input: OAuth2TokenExchangeInput) : Promise<ClientTokenExchangeCapability> {
        if (!isMatchableAudience(input.audience)) {
            throw OAuth2TargetError.audience();
        }

        const entry = await this.capabilityRepository.findOneBy({
            clientId: input.client.id,
            audience: input.audience,
        });

        // A case-insensitive collation answers a lookup that differs in case;
        // the audience is case-sensitive by contract.
        if (!entry || entry.audience !== input.audience) {
            throw OAuth2TargetError.audience();
        }

        const allowed = new Set(entry.value.split(/\s+/));

        for (const capability of input.capabilities) {
            if (allowed.has(capability.type)) {
                continue;
            }

            const denied = capability.actions.find((action) => !allowed.has(`${capability.type}:${action}`));

            if (typeof denied !== 'undefined') {
                throw OAuth2TargetError.capability(`${capability.type}:${denied}`);
            }
        }

        return entry;
    }

    /**
     * The checks the authorization middleware applies to a bearer, minus the
     * ping: an exchange is the actor's activity, not the subject's.
     */
    protected async verifySubjectToken(token: string) : Promise<OAuth2TokenExchangeSubject> {
        try {
            const payload = await this.tokenVerifier.verify(token);

            if (
                payload.kind !== OAuth2TokenKind.ACCESS ||
                typeof payload.exp !== 'number' ||
                payload.exp * 1000 <= Date.now() ||
                !payload.realm_id ||
                !payload.sub ||
                !payload.sub_kind ||
                !payload.session_id
            ) {
                throw OAuth2GrantError.invalid();
            }

            const session = await this.sessionManager.findOneById(payload.session_id);

            if (!session || !isTokenSession(session, payload)) {
                throw OAuth2GrantError.invalid();
            }

            await this.sessionManager.verify(session);

            const identity = await this.identityResolver.resolve(payload.sub_kind, payload.sub);

            if (!isTokenSubjectActive(identity, payload)) {
                throw OAuth2GrantError.invalid();
            }

            return payload as OAuth2TokenExchangeSubject;
        } catch (e) {
            if (isJWTError(e)) {
                throw OAuth2GrantError.invalid();
            }

            throw e;
        }
    }
}
