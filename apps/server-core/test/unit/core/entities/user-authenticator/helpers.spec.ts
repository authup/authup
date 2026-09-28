/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    generateNumericCode,
    generateRecoveryCode,
} from '../../../../../src/core/entities/user-authenticator/helpers.ts';

describe('core/entities/user-authenticator/helpers', () => {
    it('should generate a recovery code of two groups over the unambiguous alphabet', () => {
        for (let i = 0; i < 50; i++) {
            expect(generateRecoveryCode()).toMatch(/^[2-9a-hjkmnp-z]{5}-[2-9a-hjkmnp-z]{5}$/);
        }
    });

    it('should generate a numeric code of the requested length', () => {
        for (let i = 0; i < 50; i++) {
            expect(generateNumericCode(6)).toMatch(/^[0-9]{6}$/);
        }
    });
});
