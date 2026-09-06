/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, IdentityType, Session } from '@authup/core-kit';
import { EventName, EventRefType, EventScope } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import { normalizeError } from '@authup/errors';
import { isObject } from '@authup/kit';
import { describeError } from '../../../utils/index.ts';
import type { ISessionRevokeNotifier } from '../../authentication/session/types.ts';
import type { IEventService } from '../../entities/event/types.ts';
import type { IOAuth2ClientRepository } from '../client/types.ts';
import type { ISessionTokenRepository } from '../session-token/types.ts';
import type { IOAuth2TokenSigner } from '../token/signer/types.ts';
import {
    OAUTH2_BACKCHANNEL_LOGOUT_EVENT,
    OAUTH2_BACKCHANNEL_LOGOUT_MAX_AGE,
    OAUTH2_BACKCHANNEL_LOGOUT_TIMEOUT,
} from './constants.ts';
import type {
    OAuth2BackchannelLogoutNotifierContext,
    OAuth2BackchannelLogoutNotifierOptions,
} from './types.ts';

export class OAuth2BackchannelLogoutNotifier implements ISessionRevokeNotifier {
    protected signer: IOAuth2TokenSigner;

    protected sessionTokenRepository: ISessionTokenRepository;

    protected clientRepository: IOAuth2ClientRepository;

    protected options: OAuth2BackchannelLogoutNotifierOptions;

    protected eventService?: IEventService;

    protected logger?: Logger;

    constructor(ctx: OAuth2BackchannelLogoutNotifierContext) {
        this.signer = ctx.signer;
        this.sessionTokenRepository = ctx.sessionTokenRepository;
        this.clientRepository = ctx.clientRepository;
        this.options = ctx.options;
        this.eventService = ctx.eventService;
        this.logger = ctx.logger;
    }

    async resolve(session: Session): Promise<Client[]> {
        const tokens = await this.sessionTokenRepository.findBySessionId(session.id);

        const clientIds = new Set<string>();
        for (const token of tokens) {
            if (token.clientId) {
                clientIds.add(token.clientId);
            }
        }

        const clients : Client[] = [];
        for (const clientId of clientIds) {
            const client = await this.clientRepository.findOneByIdOrName(clientId);
            if (client && client.backchannelLogoutUri) {
                clients.push(client);
            }
        }

        return clients;
    }

    async notify(session: Session, clients: Client[]): Promise<void> {
        await Promise.allSettled(clients.map((client) => this.deliver(session, client)));
    }

    protected async deliver(session: Session, client: Client): Promise<void> {
        if (!client.backchannelLogoutUri) {
            return;
        }

        let jti: string | undefined;

        try {
            const payload = this.buildPayload(session, client);
            const logoutToken = await this.signer.sign(payload);
            jti = payload.jti;

            // `redirect: 'manual'`: a 3xx is the RP's refusal, not an
            // invitation to POST the token somewhere else.
            const response = await fetch(client.backchannelLogoutUri, {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ logout_token: logoutToken }),
                signal: AbortSignal.timeout(this.options.timeout ?? OAUTH2_BACKCHANNEL_LOGOUT_TIMEOUT),
                redirect: 'manual',
            });

            // The body is never read, and an unread body pins the keep-alive socket.
            await response.body?.cancel();

            if (!response.ok) {
                this.logger?.warn(
                    `The back-channel logout of client ${client.id} was refused with status ${response.status}.`,
                );
                await this.record(session, client, { jti, status: response.status });
                return;
            }

            await this.record(session, client, { jti });
        } catch (e) {
            this.logger?.warn(describeError(e, `The back-channel logout of client ${client.id} failed.`));
            await this.record(session, client, { jti, errorCode: describeFailureCode(e) });
        }
    }

    /**
     * One audit row per delivery (plan 064 stage 3), so an operator can see
     * which RPs actually received the push. The row is about the CLIENT
     * (the RP told), attributed to the session's subject like the LOGOUT
     * row, and realm-scoped like the token's `iss`. `jti` correlates it with
     * the RP's own log of the logout token; a failed one carries the status
     * the RP answered or the code of the failure that kept it from answering.
     * A CODE and never the rendered error: the subject reads its own rows
     * self-service, and the message names the RP's resolved address, which
     * is the log's business (`describeError` above) and not theirs.
     */
    protected async record(
        session: Session,
        client: Client,
        data: {
            jti?: string, 
            status?: number, 
            errorCode?: string 
        },
    ): Promise<void> {
        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: data.status !== undefined || data.errorCode !== undefined ?
                EventName.BACKCHANNEL_LOGOUT_FAILED :
                EventName.BACKCHANNEL_LOGOUT,
            refType: EventRefType.CLIENT,
            refId: client.id,
            clientId: client.id,
            sessionId: session.id,
            actorType: session.subKind as `${IdentityType}`,
            actorId: session.sub,
            realmId: client.realmId,
            data,
        });
    }

    protected buildPayload(session: Session, client: Client): OAuth2TokenPayload {
        const utc = Math.floor(Date.now() / 1000);

        return {
            kind: OAuth2TokenKind.LOGOUT,
            jti: randomUUID(),
            iss: this.buildIss(client),
            aud: client.id,
            sub: session.sub,
            sid: session.id,
            exp: utc + (this.options.maxAge ?? OAUTH2_BACKCHANNEL_LOGOUT_MAX_AGE),
            // The signer keys on the realm, so the claim rides along (the
            // specification permits additional claims). It is the CLIENT's
            // realm: `iss` is built from `client.realm.name`, so the signing
            // key has to come from the same realm or an RP resolving `kid`
            // through the issuer's JWKS finds nothing. The two differ on the
            // cross-realm password grant (a UUID user with the master client).
            realm_id: client.realmId,
            events: { [OAUTH2_BACKCHANNEL_LOGOUT_EVENT]: {} },
        };
    }

    /**
     * The same shape `OAuth2BaseTokenIssuer.buildIss` produces for the
     * id_token, so an RP comparing against its discovered issuer matches.
     */
    protected buildIss(client: Client): string {
        const base = this.options.issuer.replace(/\/+$/, '');

        return `${base}/realms/${client.realm.name}`;
    }
}

/**
 * The first `code` on the error or its cause chain (`ECONNREFUSED`,
 * `ENOTFOUND`, `ERR_TLS_CERT_ALTNAME_INVALID`, ...), else the error's name
 * (`TimeoutError` for the abort, `Error` for a failed signing).
 */
function describeFailureCode(input: unknown): string {
    let current: unknown = input;
    // bounded like describeCauseChain: a cause chain can be cyclic
    for (let depth = 0; isObject(current) && depth < 8; depth++) {
        const { code, cause } = current as { code?: unknown, cause?: unknown };
        if (typeof code === 'string') {
            return code;
        }
        current = cause;
    }

    return normalizeError(input).name;
}
