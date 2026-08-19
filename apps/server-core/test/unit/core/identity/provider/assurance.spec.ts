/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import {
    assertIdentityProviderAssurance,
    buildIdentityProviderAcrValues,
    isIdentityProviderAssuranceError,
} from '../../../../../src/core/identity/provider/authentication/protocols/oauth2/assurance.ts';

const encode = (input: Record<string, any>) => Buffer.from(JSON.stringify(input)).toString('base64url');

// unsigned three-segment JWT — the gate decodes, it never verifies
const idToken = (claims: Record<string, any>) => `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.x`;

function provider(overrides: Partial<OAuth2IdentityProvider> = {}) : Partial<OAuth2IdentityProvider> {
    return overrides;
}

function refusalOf(fn: () => void) : string | null {
    try {
        fn();
    } catch (e) {
        if (isIdentityProviderAssuranceError(e)) {
            return e.message;
        }

        throw e;
    }

    return null;
}

describe('core/identity/provider — assertIdentityProviderAssurance', () => {
    it('should trust the provider when neither allow-list is set', () => {
        // the pre-#3477 default: no id_token, no claims, still fine
        expect(refusalOf(() => assertIdentityProviderAssurance(provider()))).toBeNull();
        expect(refusalOf(() => assertIdentityProviderAssurance(
            provider({ requiredAmr: null, requiredAcr: '' }),
            idToken({ amr: ['pwd'] }),
        ))).toBeNull();
    });

    it.each([
        // [requiredAmr, requiredAcr, claims, accepted]
        ['mfa', null, { amr: ['pwd', 'mfa'] }, true],
        ['mfa', null, { amr: ['pwd'] }, false],
        ['mfa', null, {}, false],
        // a list is a disjunction: any intersection passes
        ['mfa, hwk', null, { amr: ['hwk'] }, true],
        ['mfa hwk', null, { amr: ['otp'] }, false],
        // a non-array amr claim never satisfies anything
        ['mfa', null, { amr: 'mfa' }, false],
        [null, 'urn:loa:silver', { acr: 'urn:loa:silver' }, true],
        [null, 'urn:loa:silver', { acr: 'urn:loa:bronze' }, false],
        [null, 'urn:loa:silver', {}, false],
        // acr is a single value matched by membership, never by prefix
        [null, 'urn:loa:silver,urn:loa:gold', { acr: 'urn:loa:gold' }, true],
        [null, '1', { acr: '1' }, true],
        // both set = both must hold
        ['mfa', '1', { amr: ['mfa'], acr: '1' }, true],
        ['mfa', '1', { amr: ['mfa'], acr: '2' }, false],
        ['mfa', '1', { amr: ['pwd'], acr: '1' }, false],
    ] as const)(
        'should decide amr=%s acr=%s against %j as accepted=%s',
        (requiredAmr, requiredAcr, claims, accepted) => {
            const refusal = refusalOf(() => assertIdentityProviderAssurance(
                provider({ requiredAmr, requiredAcr }),
                idToken(claims),
            ));

            expect(refusal === null).toBe(accepted);
        },
    );

    it.each([
        ['no id_token at all', undefined],
        ['an undecodable id_token', 'not-a-jwt'],
    ])('should refuse %s once an allow-list is set', (_label, token) => {
        // failing open here would make the feature decorative — an upstream
        // that answers without the claim is exactly what it exists to catch
        expect(refusalOf(() => assertIdentityProviderAssurance(
            provider({ requiredAmr: 'mfa' }),
            token,
        ))).not.toBeNull();
    });
});

describe('core/identity/provider — buildIdentityProviderAcrValues', () => {
    it.each([
        [undefined, undefined],
        [null, undefined],
        ['', undefined],
        ['1', '1'],
        // whichever separator the operator typed, the wire form is
        // space-delimited per OIDC Core 3.1.2.1
        ['urn:loa:silver, urn:loa:gold', 'urn:loa:silver urn:loa:gold'],
    ])('should render requiredAcr=%s as acr_values=%s', (requiredAcr, expected) => {
        expect(buildIdentityProviderAcrValues(provider({ requiredAcr }))).toEqual(expected);
    });

    it('should not derive acr_values from requiredAmr', () => {
        // amr is an observation, not something a request can ask for
        expect(buildIdentityProviderAcrValues(provider({ requiredAmr: 'mfa' }))).toBeUndefined();
    });
});
