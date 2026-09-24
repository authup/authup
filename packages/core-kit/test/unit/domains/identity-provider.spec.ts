/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { IContainer } from 'validup';
import { describe, expect, it } from 'vitest';
import type { IdentityProviderEnrollmentAttributes } from '../../../src';
import {
    IdentityProviderAttributesValidator,
    IdentityProviderLDAPAttributesValidator,
    IdentityProviderOAuth2AttributesValidator,
    IdentityProviderOAuth2PresetAttributesValidator,
} from '../../../src';

const VALIDATORS = [
    ['attributes', () => new IdentityProviderOAuth2AttributesValidator({ pathsToInclude: ['requiredAmr', 'requiredAcr'] })],
    ['preset attributes', () => new IdentityProviderOAuth2PresetAttributesValidator({ pathsToInclude: ['requiredAmr', 'requiredAcr'] })],
] as const;

describe('IdentityProvider assurance allow-lists', () => {
    describe.each(VALIDATORS)('%s validator', (_label, build) => {
        it.each([
            ['mfa'],
            ['mfa, hwk'],
            ['mfa hwk'],
            // the shortest legal acr level, which is why these mounts carry no
            // lower bound beyond non-empty
            ['1'],
        ])('should accept %s', async (value) => {
            const output = await build().run({ requiredAmr: value, requiredAcr: value });

            expect(output.requiredAmr).toEqual(value);
            expect(output.requiredAcr).toEqual(value);
        });

        it.each([
            [','],
            [',,,'],
            [' , '],
            [' '.repeat(3)],
        ])('should reject %j, which parses to no tokens at all', async (value) => {
            // it would be stored, shown as configured in the admin form, and
            // silently check nothing
            await expect(build().run({ requiredAmr: value })).rejects.toThrow();
            await expect(build().run({ requiredAcr: value })).rejects.toThrow();
        });
    });
});

const POLICY_ID = '0b7f0f4c-3e6d-4b1a-9d2e-5c8a7f6e4d3b';

const OAUTH2_ATTRIBUTES : Record<string, unknown> = {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    tokenUrl: 'https://idp.example.com/token',
    authorizeUrl: 'https://idp.example.com/authorize',
};

const PRESET_ATTRIBUTES : Record<string, unknown> = {
    preset: 'github',
    clientId: 'client-id',
    clientSecret: 'client-secret',
};

const LDAP_ATTRIBUTES : Record<string, unknown> = {
    protocol: 'ldap',
    url: 'ldap://ldap.example.com',
    user: 'cn=admin,dc=example,dc=com',
    password: 'start123',
};

type EnrollmentCase = readonly [
    label: string,
    build: () => IContainer<IdentityProviderEnrollmentAttributes>,
    attributes: Record<string, unknown>,
];

const ENROLLMENT_VALIDATORS : EnrollmentCase[] = [
    ['oauth2 attributes', () => new IdentityProviderOAuth2AttributesValidator(), OAUTH2_ATTRIBUTES],
    ['oauth2 preset attributes', () => new IdentityProviderOAuth2PresetAttributesValidator(), PRESET_ATTRIBUTES],
    ['ldap attributes', () => new IdentityProviderLDAPAttributesValidator(), LDAP_ATTRIBUTES],
];

describe('IdentityProvider enrollment gating', () => {
    describe.each(ENROLLMENT_VALIDATORS)('%s validator', (_label, build, attributes) => {
        it('should accept a disabled enrollment with a policy', async () => {
            const output = await build().run({
                ...attributes,
                enrollmentEnabled: false,
                enrollmentPolicyId: POLICY_ID,
            });

            expect(output.enrollmentEnabled).toBe(false);
            expect(output.enrollmentPolicyId).toEqual(POLICY_ID);
        });

        it('should accept null for both keys', async () => {
            const output = await build().run({
                ...attributes,
                enrollmentEnabled: null,
                enrollmentPolicyId: null,
            });

            expect(output.enrollmentEnabled).toBeNull();
            expect(output.enrollmentPolicyId).toBeNull();
        });

        it('should accept their absence', async () => {
            const output = await build().run({ ...attributes });

            expect(output.enrollmentEnabled).toBeUndefined();
            expect(output.enrollmentPolicyId).toBeUndefined();
        });

        it('should reject a policy id that is not a uuid', async () => {
            await expect(build().run({ ...attributes, enrollmentPolicyId: 'not-a-uuid' })).rejects.toThrow();
        });

        it('should reject a non-boolean enrollment switch', async () => {
            const input : Record<string, unknown> = { ...attributes, enrollmentEnabled: 'yes' };

            await expect(build().run(input)).rejects.toThrow();
        });

        it('should keep refusing missing protocol attributes next to a valid enrollment block', async () => {
            // the enrollment keys ride a key-less nested container, which merges
            // into the parent rather than turning it into a oneOf
            await expect(build().run({
                enrollmentEnabled: false,
                enrollmentPolicyId: POLICY_ID,
            })).rejects.toThrow();
        });
    });

    it('should resolve pathsToInclude into the nested enrollment mount', async () => {
        // the kit's field-group sub-forms scope a shared validator this way
        const output = await new IdentityProviderOAuth2AttributesValidator({ pathsToInclude: ['enrollmentEnabled'] })
            .run({ enrollmentEnabled: false });

        expect(output).toEqual({ enrollmentEnabled: false });
    });

    it('should accept an OAuth2 payload carrying the two keys through the oneOf validator', async () => {
        const output = await new IdentityProviderAttributesValidator().run({
            ...OAUTH2_ATTRIBUTES,
            enrollmentEnabled: false,
            enrollmentPolicyId: POLICY_ID,
        });

        expect(output.clientId).toEqual(OAUTH2_ATTRIBUTES.clientId);
        expect(output.enrollmentEnabled).toBe(false);
        expect(output.enrollmentPolicyId).toEqual(POLICY_ID);
    });
});
