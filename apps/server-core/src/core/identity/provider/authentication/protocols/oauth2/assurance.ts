/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProviderBase } from '@authup/core-kit';
import { ValidationError, markInstanceof, matchesInstanceof } from '@authup/errors';
import { extractTokenPayload } from '@authup/server-kit';

export const IDENTITY_PROVIDER_ASSURANCE_ERROR_INSTANCE = Symbol.for('@authup/server-core/IdentityProviderAssuranceError');

/**
 * The upstream did not meet the provider's `requiredAmr` / `requiredAcr`.
 *
 * It adds no dedicated `ErrorCode` and keeps `ValidationError`'s shared
 * `BAD_REQUEST`, so the marker is the ONLY thing the guard may read - a
 * code fallback would match every other `ValidationError` in the process.
 * That is sound here because both callers swallow it into a redirect (the
 * login bounces to the hosted page with `access_denied`, the link callback
 * with `linkError`), so it never crosses a wire boundary. The reason lands
 * in the operator's log instead, which is where a misconfigured allow-list
 * is debugged.
 */
export class IdentityProviderAssuranceError extends ValidationError {
    constructor(message: string) {
        super(message);
        markInstanceof(this, IDENTITY_PROVIDER_ASSURANCE_ERROR_INSTANCE);
    }
}

export function isIdentityProviderAssuranceError(input: unknown): input is IdentityProviderAssuranceError {
    return matchesInstanceof(input, IDENTITY_PROVIDER_ASSURANCE_ERROR_INSTANCE);
}

/**
 * `unknown`, not `string | null`, because these are extra-attribute rows and
 * the EA value column round-trips through `destr`: a stored `"1"` - the
 * canonical PAPE / ISO-29115 acr level, and the shortest value the validator
 * deliberately allows - is read back as the NUMBER `1`. Calling a string
 * method on that threw, and `"0"` (falsy) silently disabled the whole check.
 */
function splitList(input?: unknown): string[] {
    if (input === null || typeof input === 'undefined') {
        return [];
    }

    return String(input).split(/[\s,]+/).filter(Boolean);
}

/**
 * The `acr_values` an outbound authorize request asks for, so the upstream is
 * asked to step up rather than merely observed. Voluntary in OIDC Core
 * 5.5.1.1 - a provider may ignore it and answer anyway, which is exactly what
 * {@see assertIdentityProviderAssurance} is for.
 */
export function buildIdentityProviderAcrValues(provider: Partial<OAuth2IdentityProviderBase>): string | undefined {
    const values = splitList(provider.requiredAcr);
    return values.length > 0 ? values.join(' ') : undefined;
}

/**
 * Verify what the upstream actually returned against the provider's
 * allow-lists.
 *
 * Fail closed on every uncertainty: the claims are read from the `id_token`
 * alone, so a provider that returns none - or one whose token carries neither
 * claim, or cannot be decoded - is refused once an allow-list is set. Failing
 * open there would make the feature decorative.
 *
 * The token is DECODED, not verified, and that is not an oversight. It is the
 * return value of the server's own back-channel POST to the operator-configured
 * `tokenUrl`, so OIDC Core 3.1.3.7 item 6 accepts TLS server validation in
 * place of checking the signature. No browser-supplied token reaches here, and
 * a provider the operator configured is the authentication authority for these
 * users anyway: one that lies about `amr` could equally mint any subject. What
 * item 6 does NOT waive is the audience, which is checked below because
 * `clientId` is already in hand.
 */
export function assertIdentityProviderAssurance(
    provider: Partial<OAuth2IdentityProviderBase>,
    idToken?: string,
): void {
    const requiredAmr = splitList(provider.requiredAmr);
    const requiredAcr = splitList(provider.requiredAcr);

    if (requiredAmr.length === 0 && requiredAcr.length === 0) {
        return;
    }

    if (typeof idToken !== 'string') {
        throw new IdentityProviderAssuranceError('The identity provider returned no id_token to verify.');
    }

    let claims : Record<string, any>;
    try {
        // `?? {}` against the declared return type on purpose: a payload of
        // literal `null` parses, so the claim reads below would throw a
        // TypeError out of a callback that has to answer with a refusal.
        claims = extractTokenPayload(idToken) ?? {};
    } catch {
        throw new IdentityProviderAssuranceError('The identity provider id_token could not be read.');
    }

    // OIDC Core 3.1.3.7 items 3-5, the part item 6 does not excuse. Guarded on
    // `clientId` because the gate takes a partial provider: an absent client id
    // has nothing to compare against, and inventing a refusal there would fail
    // a login over a value the caller never supplied.
    if (provider.clientId) {
        const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
        if (!audiences.includes(provider.clientId)) {
            throw new IdentityProviderAssuranceError(
                'The identity provider id_token was not issued for this client.',
            );
        }

        if (typeof claims.azp === 'string' && claims.azp !== provider.clientId) {
            throw new IdentityProviderAssuranceError(
                'The identity provider id_token was issued for another party.',
            );
        }
    }

    if (requiredAmr.length > 0) {
        const amr = Array.isArray(claims.amr) ? claims.amr : [];
        if (!requiredAmr.some((value) => amr.includes(value))) {
            throw new IdentityProviderAssuranceError(
                `The identity provider amr claim does not satisfy: ${requiredAmr.join(', ')}.`,
            );
        }
    }

    if (requiredAcr.length > 0 && !requiredAcr.includes(claims.acr)) {
        throw new IdentityProviderAssuranceError(
            `The identity provider acr claim does not satisfy: ${requiredAcr.join(', ')}.`,
        );
    }
}
