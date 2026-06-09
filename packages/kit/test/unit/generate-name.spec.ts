/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { generateName } from '../../src';

describe('generateName', () => {
    it('produces a readable, url-friendly name with a hex suffix', () => {
        for (let i = 0; i < 100; i++) {
            const name = generateName();

            expect(name).toMatch(/^[a-z]+-[a-z]+-[0-9a-f]{6}$/);
            expect(name.length).toBeGreaterThanOrEqual(3);
            expect(name.length).toBeLessThanOrEqual(128);
        }
    });

    it('is practically unique across calls', () => {
        const names = new Set(Array.from({ length: 200 }, () => generateName()));
        expect(names.size).toBeGreaterThan(195);
    });

    it('is deterministic for a given seed', () => {
        expect(generateName('seed-a')).toBe(generateName('seed-a'));
        expect(generateName('v-0')).not.toBe(generateName('v-1'));
    });

    it('still produces a valid name when seeded', () => {
        const name = generateName('hydration-stable-id');
        expect(name).toMatch(/^[a-z]+-[a-z]+-[0-9a-f]{6}$/);
    });
});
