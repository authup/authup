/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTAlgorithm, OAuth2TokenPayload } from '@authup/specs';
import {
    JWTError,
    OAuth2AuthenticationContextClass,
    OAuth2AuthenticationMethodReference,
} from '@authup/specs';
import type { Session } from '@authup/core-kit';
import { SessionAuthMethod } from '@authup/core-kit';
import { subtle } from 'uncrypto';

/**
 * Derive the OIDC `amr` / `acr` claims from the backing session's
 * authMethod + mfaAt (plan 050). Pre-column sessions (null authMethod)
 * yield no claims — authup cannot retroactively know how an old session
 * authenticated. M2M methods yield none either (amr/acr are user-flow
 * claims; those grants mint no id_token).
 */
export function deriveAmrAcr(
    session: Pick<Session, 'authMethod' | 'mfaAt'> | null,
): Pick<OAuth2TokenPayload, 'amr' | 'acr'> {
    if (!session || !session.authMethod) {
        return {};
    }

    const amr : string[] = [];
    switch (session.authMethod) {
        case SessionAuthMethod.PASSWORD:
        case SessionAuthMethod.LDAP: {
            // LDAP is still a password factor for amr — the finer
            // distinction lives in the authup-local authMethod.
            amr.push(OAuth2AuthenticationMethodReference.PASSWORD);
            break;
        }
        case SessionAuthMethod.EXTERNAL: {
            amr.push(OAuth2AuthenticationMethodReference.EXTERNAL);
            break;
        }
        default: {
            return {};
        }
    }

    if (session.mfaAt) {
        amr.push(OAuth2AuthenticationMethodReference.OTP);
    }

    if (session.mfaAt) {
        return { amr, acr: OAuth2AuthenticationContextClass.MFA };
    }

    // No `acr` for a session an external provider authenticated: authup
    // verified no credential of its own, so it asserts no assurance level.
    // `urn:authup:pwd` would say the subject authenticated with a password,
    // which is exactly what did NOT happen (issue #3478). Per OIDC Core
    // §2 the claim is voluntary, so the absence is the honest answer, and
    // `amr: ['ext']` still says how the login happened.
    if (session.authMethod === SessionAuthMethod.EXTERNAL) {
        return { amr };
    }

    return { amr, acr: OAuth2AuthenticationContextClass.PASSWORD };
}

export function generateOAuth2CodeVerifier() {
    const length = 64;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

    let codeVerifier = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
        codeVerifier += charset[randomValues[i] % charset.length];
    }

    return codeVerifier;
}

export function base64URLEncode(arrayBuffer: ArrayBuffer) {
    // Convert the ArrayBuffer to string using Uint8 array.
    // btoa takes chars from 0-255 and base64 encodes.
    // Then convert the base64 encoded to base64url encoded.
    // (replace + with -, replace / with _, trim trailing =)
    const charCode = Array.from(new Uint8Array(arrayBuffer));

    return btoa(String.fromCharCode.apply(null, charCode))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// OIDC Core §3.1.3.6: at_hash / c_hash use the hash algorithm of the id_token's
// JWS alg (…S256 → SHA-256, …S384 → SHA-384, …S512 → SHA-512) and keep the LEFT
// HALF of the digest — so the half-length follows the digest (16/24/32 bytes).
const TOKEN_HASH_DIGESTS : Record<string, { name: string, halfLength: number }> = {
    256: { name: 'SHA-256', halfLength: 16 },
    384: { name: 'SHA-384', halfLength: 24 },
    512: { name: 'SHA-512', halfLength: 32 },
};

export async function buildOAuth2TokenHash(
    value: string,
    alg?: `${JWTAlgorithm}` | null,
) : Promise<string> {
    // A key row without a persisted alg (nullable legacy column) signs with
    // the signer's *256 default (RS256/ES256/HS256) — derive the matching
    // SHA-256 digest. An unrecognized alg still fails loud — silently
    // defaulting there would mint a hash no conforming verifier accepts.
    const digest = alg ?
        TOKEN_HASH_DIGESTS[alg.slice(-3)] :
        TOKEN_HASH_DIGESTS['256'];
    if (!digest) {
        throw JWTError.headerPropertyInvalid('alg');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await subtle.digest(digest.name, data);
    const halfHash = hashBuffer.slice(0, digest.halfLength);

    return base64URLEncode(halfHash);
}

/**
 * A PKCE pair for a server-side authorization request (plan 088: the console
 * login kick mints one, keeps the verifier in the pending login and sends the
 * challenge to `/authorize`).
 *
 * Snake_case because these are wire parameters, not domain properties, and it
 * mirrors the kit's browser-side `createPKCE()` so the two paths read alike.
 */
export type OAuth2PKCE = {
    code_verifier: string,
    code_challenge: string,
    code_challenge_method: 'S256',
};

export async function createOAuth2PKCE() : Promise<OAuth2PKCE> {
    const codeVerifier = generateOAuth2CodeVerifier();

    return {
        code_verifier: codeVerifier,
        code_challenge: await buildOAuth2CodeChallenge(codeVerifier),
        code_challenge_method: 'S256',
    };
}

export async function buildOAuth2CodeChallenge(codeVerifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const arrayBuffer = await subtle.digest('SHA-256', data);

    return base64URLEncode(arrayBuffer);
}
