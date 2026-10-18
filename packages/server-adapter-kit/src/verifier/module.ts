/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenCreator } from '@authup/core-http-kit';
import { Client } from '@authup/core-http-kit';
import { JWTError } from '@authup/specs';
import type { OAuth2TokenPayload } from '@authup/specs';
import type { IntrospectionAuthorizationContext, Verifier } from 'vouchly';
import { createVerifier } from 'vouchly';
import { toJWTError } from './error';
import { createAuthupIssuer } from './issuer';
import type {
    ITokenVerifier,
    TokenVerificationData,
    TokenVerificationDataInput,
    TokenVerifierContext,
    TokenVerifyOptions,
} from './types';

/**
 * The Authorization header remote mode introspects with: the token the
 * creator mints, kept until authup answers 401 (vouchly then asks again
 * with retry) or a mint failed.
 */
const REMINT_REUSE_MS = 5_000;

function createIntrospectionAuthorization(creator: TokenCreator) {
    let pending : Promise<string> | undefined;

    // An expired client token should cost one client_credentials grant, not
    // one per request answered 401: a retry joins a re-mint still running,
    // and reuses one that finished in the last REMINT_REUSE_MS, since a 401
    // that soon belongs to the token it replaced.
    let reminting : Promise<string> | undefined;
    let remintedAt = 0;

    const mint = () => {
        const current = creator().then((response) => `Bearer ${response.access_token}`);
        pending = current;
        current.catch(() => {
            if (pending === current) {
                pending = undefined;
            }
        });

        return current;
    };

    return async (context: IntrospectionAuthorizationContext) : Promise<string> => {
        if (context.retry) {
            if (reminting) {
                return reminting;
            }

            if (pending && Date.now() - remintedAt < REMINT_REUSE_MS) {
                return pending;
            }

            const current = mint();
            reminting = current;
            current
                .then(() => {
                    remintedAt = Date.now();
                })
                .finally(() => {
                    if (reminting === current) {
                        reminting = undefined;
                    }
                })
                .catch(() => undefined);

            return current;
        }

        return pending ?? mint();
    };
}

function buildIntrospectionEndpoint(baseURL: string) : string {
    return new URL('token/introspect', baseURL.endsWith('/') ? baseURL : `${baseURL}/`).href;
}

export class TokenVerifier implements ITokenVerifier {
    protected client: Client;

    protected verifier: Verifier;

    constructor(ctx: TokenVerifierContext) {
        this.client = new Client({ baseURL: ctx.baseURL });

        const remote = !!ctx.creator;

        // a cache passed in may be shared, so its entries are namespaced by
        // mode and deployment: a local and a remote verifier of one
        // deployment must never serve each other's results.
        let cacheNamespace : string | undefined;
        if (ctx.cache) {
            cacheNamespace = ctx.cacheNamespace ?? `authup:${remote ? 'remote' : 'local'}:${ctx.baseURL}`;
        }

        this.verifier = createVerifier({
            issuers: [
                createAuthupIssuer({
                    client: this.client,
                    jwkCache: ctx.jwkCache,
                    ...(ctx.creator ?
                        {
                            remote: {
                                endpoint: buildIntrospectionEndpoint(ctx.baseURL),
                                authorization: createIntrospectionAuthorization(ctx.creator),
                                // 0 has always meant no cap
                                maxCacheTTL: ctx.maxRemoteCacheTTL || undefined,
                            },
                        } :
                        {}),
                }),
            ],
            // no result cache unless one is passed in: a cached result outlives a
            // disabled signing key and a revoked token until the token's exp.
            cache: ctx.cache ?? false,
            cacheNamespace,
            ...(remote ? { opaque: 'authup' } : {}),
        });
    }

    async verify(token: string, options: TokenVerifyOptions = {}) : Promise<TokenVerificationData> {
        let payload : OAuth2TokenPayload;
        try {
            const result = await this.verifier.verify(token, { certificateThumbprint: options.certificateThumbprint });
            payload = result.claims as OAuth2TokenPayload;
        } catch (e) {
            throw toJWTError(e);
        }

        this.assertNotExpired(payload);

        return this.transform(payload);
    }

    /**
     * The clock leeway applies to nbf only: a token past its exp is expired,
     * whatever the leeway, and a result without exp is refused.
     *
     * @param payload
     * @protected
     */
    protected assertNotExpired(payload: OAuth2TokenPayload) : void {
        if (!payload.exp) {
            throw JWTError.payloadPropertyInvalid('exp');
        }

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp - now <= 0) {
            throw JWTError.expired();
        }
    }

    protected transform(input: TokenVerificationDataInput) : TokenVerificationData {
        return {
            ...input,
            permissions: input.permissions || [],
        };
    }
}
