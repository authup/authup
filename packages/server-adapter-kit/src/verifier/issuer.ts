/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-http-kit';
import { isObject, isUUID } from '@authup/kit';
import type { OAuth2JsonWebKey } from '@authup/specs';
import { JWTError, OAuth2TokenKind } from '@authup/specs';
import type {
    IntrospectionAuthorizationContext,
    Issuer,
    KeySource,
    KeySourceContext,
} from 'vouchly';
import { cachedKeys } from 'vouchly';
import type { TokenVerifierContext } from './types';

type AuthupIssuerContext = {
    client: Client,
    jwkCache?: TokenVerifierContext['jwkCache'],
    /**
     * Introspect every token at authup instead of verifying it locally.
     */
    remote?: {
        endpoint: string,
        authorization: (context: IntrospectionAuthorizationContext) => Promise<string>,
        maxCacheTTL?: number,
    },
};

type KeyLoader = Parameters<typeof cachedKeys>[0];

type KeyLookup = {
    kid: string,
    realmId: string,
};

/**
 * Reads the kid and the realm a token names, before any request: the key is
 * read from that realm, so a key of another realm can never verify the token.
 * uuids compare case-insensitively, so they are lower-cased once here.
 */
function readKeyLookup(context: KeySourceContext) : KeyLookup {
    const { kid } = context.token.header;

    if (typeof kid !== 'string' || !isUUID(kid)) {
        throw JWTError.headerPropertyInvalid('kid');
    }

    // authup always stamps the realm's uuid. A name or a path segment such as
    // '..' would change the key URL: '/realms/../jwks/<kid>' is the flat key
    // endpoint, which serves a key of any realm.
    const { realm_id: realmId } = context.token.claims;

    if (typeof realmId !== 'string' || !isUUID(realmId)) {
        throw JWTError.payloadPropertyInvalid('realm_id');
    }

    return {
        kid: kid.toLowerCase(),
        realmId: realmId.toLowerCase(),
    };
}

function createKeyLoader(client: Client) : KeyLoader {
    return async (context) => {
        const { kid, realmId } = readKeyLookup(context);

        let jwk : OAuth2JsonWebKey;

        try {
            jwk = await client.getJwk(kid, realmId);
        } catch (e) {
            if (isObject(e) && isObject(e.response) && e.response.status === 404) {
                throw JWTError.payloadPropertyInvalid('kid');
            }

            throw new JWTError({
                message: 'Failed to fetch JWK from auth server.',
                cause: e as Error,
            });
        }

        // authup always names the algorithm of a realm key; a key without one
        // would be imported with whatever the token header claims.
        if (!jwk.alg) {
            throw JWTError.payloadInvalid('The jwt key is not valid.');
        }

        return jwk as Awaited<ReturnType<KeyLoader>>;
    };
}

export function createAuthupIssuer(ctx: AuthupIssuerContext) : Issuer {
    const load = createKeyLoader(ctx.client);

    let keys : KeySource;

    if (ctx.jwkCache === false) {
        keys = load;
    } else {
        keys = cachedKeys(load, {
            key: (context) => {
                const { kid, realmId } = readKeyLookup(context);

                return `${realmId}:${kid}`;
            },
            ttl: ctx.jwkCache?.ttl,
            timeout: ctx.jwkCache?.timeout,
        });
    }

    const issuer : Issuer = {
        id: 'authup',
        // matched on the realm, not on iss: a deployment reaching authup
        // through an internal url sees another iss than the public one.
        issuer: (claims) => typeof claims.realm_id === 'string' && claims.realm_id.length > 0,
        keys,
        // 60 seconds is the leeway @node-rs/jsonwebtoken applied, so an
        // issuer whose clock runs slightly ahead still passes nbf.
        clockTolerance: 60,
        requiredClaims: ['exp'],
        // A bearer must be an ACCESS token: authup signs other kinds with the
        // same keys (refresh tokens, the MFA-pending login ticket). Kind-less
        // payloads pass (foreign or legacy tokens).
        claims: (claims) => typeof claims.kind === 'undefined' || claims.kind === OAuth2TokenKind.ACCESS,
    };

    if (ctx.remote) {
        // authup decides about every token it is asked about, whatever the
        // token names, so remote mode matches any compact token.
        issuer.issuer = () => true;
        issuer.verification = 'remote';
        issuer.introspection = {
            endpoint: ctx.remote.endpoint,
            authorization: ctx.remote.authorization,
            maxCacheTTL: ctx.remote.maxCacheTTL,
        };
    }

    return issuer;
}
