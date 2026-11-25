/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { buildUUIDv7LowerBound, createUUIDv7, isUUID } from '../../src/index.ts';

describe('isUUID', () => {
    it('accepts a v4 id', () => {
        expect(isUUID(crypto.randomUUID())).toBe(true);
        expect(isUUID('a7c9a1d2-6f4b-4c1e-9d8a-2b3c4d5e6f70')).toBe(true);
    });

    it('accepts the RFC 9562 versions 6 to 8', () => {
        expect(isUUID('1ef21d2f-1207-6660-8c4f-419efbd44d48')).toBe(true);
        expect(isUUID('019b0000-0000-7000-8000-000000000001')).toBe(true);
        expect(isUUID('017f22e2-79b0-7cc3-98c4-dc0c0c07398f')).toBe(true);
        expect(isUUID('2489e9ad-2ee2-8e00-8ec9-32d5f69181c0')).toBe(true);
    });

    it('accepts upper case', () => {
        expect(isUUID('019B0000-0000-7000-8000-000000000001')).toBe(true);
    });

    it('keeps accepting the nil uuid', () => {
        expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('refuses a version nibble above 8', () => {
        expect(isUUID('019b0000-0000-9000-8000-000000000001')).toBe(false);
        expect(isUUID('019b0000-0000-f000-8000-000000000001')).toBe(false);
    });

    it('refuses a variant outside [089ab]', () => {
        expect(isUUID('019b0000-0000-7000-c000-000000000001')).toBe(false);
    });

    it('refuses other shapes', () => {
        expect(isUUID('')).toBe(false);
        expect(isUUID('admin')).toBe(false);
        expect(isUUID('019b0000000070008000000000000001')).toBe(false);
        expect(isUUID('019b0000-0000-7000-8000-0000000000011')).toBe(false);
    });
});

describe('createUUIDv7', () => {
    const FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('produces a lowercase v7 uuid', () => {
        const id = createUUIDv7();

        expect(id).toMatch(FORMAT);
        expect(isUUID(id)).toBe(true);
    });

    it('stays ordered across a burst in one millisecond', () => {
        vi.spyOn(Date, 'now').mockReturnValue(0x0200_1000_0000);

        const ids = Array.from({ length: 10000 }, () => createUUIDv7());

        expect(new Set(ids).size).toBe(10000);
        expect([...ids].sort()).toEqual(ids);
    });

    it('stays ordered when the clock steps back beyond the default rollback allowance', () => {
        const now = vi.spyOn(Date, 'now');

        now.mockReturnValue(0x0200_2000_0000);

        const first = createUUIDv7();

        now.mockReturnValue(0x0200_2000_0000 - 60_000);

        const second = createUUIDv7();
        const third = createUUIDv7();

        expect(first < second).toBe(true);
        expect(second < third).toBe(true);
    });

    it('is increasing across milliseconds', () => {
        const now = vi.spyOn(Date, 'now');

        now.mockReturnValue(0x0200_3000_0000);

        const first = createUUIDv7();

        now.mockReturnValue(0x0200_3000_0001);

        const second = createUUIDv7();

        expect(first < second).toBe(true);
    });
});

describe('buildUUIDv7LowerBound', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('zeroes every random bit', () => {
        expect(buildUUIDv7LowerBound(0x0190_1234_5678)).toBe('01901234-5678-7000-8000-000000000000');
    });

    it('bounds the ids of its millisecond from below', () => {
        const timestamp = 0x0200_4000_0000;

        vi.spyOn(Date, 'now').mockReturnValue(timestamp);

        const id = createUUIDv7();

        expect(buildUUIDv7LowerBound(timestamp) <= id).toBe(true);
        expect(id < buildUUIDv7LowerBound(timestamp + 1)).toBe(true);
    });
});
