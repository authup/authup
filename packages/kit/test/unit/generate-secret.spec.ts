/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { generateSecret } from '../../src';

describe('generateSecret', () => {
    it('produces a 32-char secret from the expected charset', () => {
        for (let i = 0; i < 100; i++) {
            const secret = generateSecret();

            expect(secret).toHaveLength(32);
            expect(secret).toMatch(/^[0-9a-zA-Z\-_!.]{32}$/);
        }
    });

    it('is practically unique across calls', () => {
        const secrets = new Set(Array.from({ length: 200 }, () => generateSecret()));
        expect(secrets.size).toBe(200);
    });
});
