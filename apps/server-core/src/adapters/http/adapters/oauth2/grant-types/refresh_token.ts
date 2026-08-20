/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Client, isClientPublic } from '@authup/core-kit';
import type { OAuth2TokenConfirmation, OAuth2TokenGrantResponse } from '@authup/specs';
import {
    OAuth2GrantError,
    OAuth2RequestError,
    OAuth2TokenGrant,
    isJWTError,
} from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { OAuth2RefreshTokenGrant, assertClientGrantAllowed } from '../../../../../core/index.ts';
import type {
    IOAuth2TokenVerifier,
    IRealmRepository,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import type { HTTPOAuth2RefreshTokenGrantContext, IHTTPOAuth2Grant } from './types.ts';
import type { CertificateSource } from '../../../request/index.ts';
import {
    extractClientCredentialsFromRequest,
    extractOAuth2ClientCertificateEvidence,
    readRealmHint,
} from './utils/index.ts';

export class HTTPOAuth2RefreshTokenGrant extends OAuth2RefreshTokenGrant implements IHTTPOAuth2Grant {
    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected refreshTokenVerifier : IOAuth2TokenVerifier;

    protected realmRepository : IRealmRepository;

    protected certificateSource: CertificateSource;

    constructor(ctx: HTTPOAuth2RefreshTokenGrantContext) {
        super(ctx);

        this.clientAuthenticator = ctx.clientAuthenticator;
        this.refreshTokenVerifier = ctx.tokenVerifier;
        this.realmRepository = ctx.realmRepository;
        this.certificateSource = ctx.certificateSource ?? 'disabled';
    }

    async runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);
        const refreshToken = body?.refresh_token;
        if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
            throw OAuth2RequestError.malformed();
        }

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);
        const certificateEvidence = await extractOAuth2ClientCertificateEvidence(event, this.certificateSource);

        // RFC 6749 §6: verify the refresh token first to learn its bound
        // client (if any), then enforce binding. Authenticate the requesting
        // client when credentials are present, or when the token requires
        // a client binding.
        //
        // skipActiveCheck: the durable auth_session_tokens row (not the cache
        // blocklist) is the refresh-token authority, so a replayed/consumed
        // token must reach runWith() to trigger family revocation instead of
        // being rejected here with JWT_INACTIVE.
        let payload : Awaited<ReturnType<typeof this.refreshTokenVerifier.verify>>;
        try {
            payload = await this.refreshTokenVerifier.verify(refreshToken, { skipActiveCheck: true });
        } catch (e) {
            // RFC 6749 §5.2: a refresh token the endpoint cannot accept is
            // `invalid_grant` (400). A verification failure raises a JWT
            // error, which answers 401 on a resource route (RFC 6750 §3.1),
            // and letting that status escape here would report a bad GRANT
            // as if the CLIENT had failed to authenticate. The branches
            // below already answer `invalid_grant` for a token bound to
            // another client, so this keeps one shape for the parameter.
            if (isJWTError(e)) {
                throw OAuth2GrantError.invalid();
            }

            throw e;
        }

        let client: Client | undefined;

        if (clientId) {
            // A client authenticated itself. Resolve by the presented
            // id/secret (name resolution scoped by the realm hint — resolved
            // lazily so a bare refresh skips the SELECT) and enforce the
            // token↔client binding.
            const realm = await this.realmRepository.resolve(readRealmHint(body), true);

            client = await this.clientAuthenticator.authenticate(
                clientId,
                clientSecret,
                realm.id,
                certificateEvidence,
            );

            if (payload.client_id && payload.client_id !== client.id) {
                throw OAuth2GrantError.invalid();
            }
        } else if (payload.client_id) {
            // No client credentials were presented, but the token is bound to
            // a client. RFC 6749 §10.4: a public client cannot authenticate
            // (no secret) and is not required to — the bound identity is read
            // from the signed token (client_id is server-minted, so trusted)
            // and refresh-token rotation/replay detection is the abuse control.
            // A client with an authentication method MUST still authenticate.
            // Supplying the server-minted client id lets TLS clients prove
            // themselves with the request certificate, while a secret client
            // still fails because its secret is absent.
            client = await this.clientAuthenticator.authenticate(
                payload.client_id,
                undefined,
                undefined,
                certificateEvidence,
            );
        }

        if (client) {
            assertClientGrantAllowed(client, OAuth2TokenGrant.REFRESH_TOKEN);
        }

        let confirmation: OAuth2TokenConfirmation | undefined;
        if (payload.cnf) {
            const expectedThumbprint = payload.cnf['x5t#S256'];
            if (typeof expectedThumbprint !== 'string' || expectedThumbprint.length === 0) {
                throw OAuth2GrantError.invalid();
            }

            confirmation = this.clientAuthenticator.validateCertificateEvidenceForBinding(
                certificateEvidence,
            );
            if (confirmation['x5t#S256'] !== expectedThumbprint) {
                throw OAuth2GrantError.invalid();
            }
        } else if (client) {
            confirmation = this.clientAuthenticator.resolveTokenBinding(client, certificateEvidence);
        }

        // Realm parity for PUBLIC clients only: a public client may not refresh
        // a token whose realm differs from the (bound) client's own realm.
        // Kills cross-realm refresh tokens minted for a public `web` client
        // before the authorize-side realm gate existed. Authenticated clients
        // are exempt — the configured secret/certificate proves identity, and the
        // documented cross-realm password grant (UUID-identified user against a
        // master-realm client) depends on that exemption.
        if (
            client &&
            isClientPublic(client) &&
            payload.realm_id &&
            payload.realm_id !== client.realmId
        ) {
            throw OAuth2GrantError.invalid();
        }

        return this.runWith(payload, {
            confirmation,
            ipAddress: getRequestIP(event) ?? undefined,
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }
}
