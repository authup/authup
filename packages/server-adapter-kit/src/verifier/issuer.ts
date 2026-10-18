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
import type { Issuer, KeySource, KeySourceContext } from 'vouchly';
import { cachedKeys } from 'vouchly';
import type { TokenVerifierContext } from './types';

type AuthupIssuerContext = {
    client: Client,
    jwkCache?: TokenVerifierContext['jwkCache'],
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

    const { realm_id: realmId } = context.token.claims;
    if (typeof realmId !== 'string' || !realmId) {
        throw JWTError.payloadPropertyInvalid('realm_id');
    }

    return {
        kid: kid.toLowerCase(),
        realmId: isUUID(realmId) ? realmId.toLowerCase() : realmId,
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

    return {
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
}
