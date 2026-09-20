/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, ClientAuthenticationHook } from '@authup/core-http-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { withHostLock } from './lock.ts';
import type { HostTokens } from './store/index.ts';
import type { HostClientContext } from './types.ts';

export function tokensFromGrant(grant: OAuth2TokenGrantResponse, now = Date.now()) : HostTokens {
    return {
        accessToken: grant.access_token,
        refreshToken: grant.refresh_token,
        expiresAt: now + grant.expires_in * 1000,
    };
}

function grantFromTokens(tokens: HostTokens, now = Date.now()) : OAuth2TokenGrantResponse {
    return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: Math.max(0, Math.floor((tokens.expiresAt - now) / 1000)),
        token_type: 'Bearer',
    };
}

/**
 * The refresh grant runs on a client of its own, with no hook attached: a
 * 401 at /token would otherwise re-enter the hook, whose in-flight refresh
 * promise is the one awaiting that very request.
 */
export function createHostClient(context: HostClientContext) : Client {
    const client = new Client({ baseURL: context.host, transport: context.transport });
    const tokenClient = new Client({ baseURL: context.host, transport: context.transport });

    let { tokens } = context;

    const hook = new ClientAuthenticationHook({
        timer: false,
        tokenCreator: () => withHostLock(context.directory, async () => {
            const stored = await context.storage.read(context.host);
            if (stored && stored.accessToken !== tokens.accessToken) {
                tokens = stored;

                return grantFromTokens(stored);
            }

            if (!tokens.refreshToken) {
                throw new Error(`The access token for ${context.host} expired and the client issued no refresh token. Run \`authup login\` again.`);
            }

            // No `client_id`: a name resolves within the request's realm
            // hint, the refresh grant carries none, so the server resolves
            // the client from the token's own `client_id` claim instead.
            const grant = await tokenClient.token.createWithRefreshToken({ refresh_token: tokens.refreshToken });

            tokens = tokensFromGrant(grant);
            await context.storage.write(context.host, tokens);

            return grant;
        }),
    });

    hook.setAuthorizationHeader({ type: 'Bearer', token: tokens.accessToken });
    hook.attach(client);

    return client;
}
