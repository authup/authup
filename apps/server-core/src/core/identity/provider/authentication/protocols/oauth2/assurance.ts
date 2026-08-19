/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider } from '@authup/core-kit';
import { ValidationError, markInstanceof, matchesInstanceof } from '@authup/errors';
import { extractTokenPayload } from '@authup/server-kit';

export const IDENTITY_PROVIDER_ASSURANCE_ERROR_INSTANCE = Symbol.for('@authup/server-core/IdentityProviderAssuranceError');

/**
 * The upstream did not meet the provider's `requiredAmr` / `requiredAcr`.
 *
 * It carries no dedicated `ErrorCode`: both callers swallow it into a
 * redirect (the login bounces to the hosted page with `access_denied`, the
 * link callback with `linkError`), so it never reaches a wire body and the
 * marker is the only discriminator anyone reads. The reason lands in the
 * operator's log instead, which is where a misconfigured allow-list is
 * debugged.
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

function splitList(input?: string | null): string[] {
    if (!input) {
        return [];
    }

    return input.split(/[\s,]+/).filter(Boolean);
}

/**
 * The `acr_values` an outbound authorize request asks for, so the upstream is
 * asked to step up rather than merely observed. Voluntary in OIDC Core
 * 5.5.1.1 - a provider may ignore it and answer anyway, which is exactly what
 * {@see assertIdentityProviderAssurance} is for.
 */
export function buildIdentityProviderAcrValues(provider: Partial<OAuth2IdentityProvider>): string | undefined {
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
 */
export function assertIdentityProviderAssurance(
    provider: Partial<OAuth2IdentityProvider>,
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
        claims = extractTokenPayload(idToken);
    } catch {
        throw new IdentityProviderAssuranceError('The identity provider id_token could not be read.');
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
