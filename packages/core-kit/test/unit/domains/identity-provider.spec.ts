/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { describe, expect, it } from 'vitest';
import {
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
            ['   '],
        ])('should reject %j, which parses to no tokens at all', async (value) => {
            // it would be stored, shown as configured in the admin form, and
            // silently check nothing
            await expect(build().run({ requiredAmr: value })).rejects.toThrow();
            await expect(build().run({ requiredAcr: value })).rejects.toThrow();
        });
    });
});
