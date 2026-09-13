/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    OAUTH2_DEVICE_USER_CODE_ALPHABET,
    OAUTH2_DEVICE_USER_CODE_LENGTH,
    formatDeviceUserCode,
    generateDeviceUserCode,
    normalizeDeviceUserCode,
} from '../../../../../src/core/oauth2/device-authorization/index.ts';

describe('core/oauth2/device-authorization/user-code', () => {
    it('should generate codes over the consonant alphabet only', () => {
        expect(OAUTH2_DEVICE_USER_CODE_ALPHABET).toEqual('BCDFGHJKLMNPQRSTVWXZ');
        expect(OAUTH2_DEVICE_USER_CODE_LENGTH).toEqual(8);

        const pattern = /^[BCDFGHJKLMNPQRSTVWXZ]{8}$/;
        for (let i = 0; i < 1000; i++) {
            const code = generateDeviceUserCode();
            expect(code).toHaveLength(8);
            expect(code).toMatch(pattern);
            expect(code).not.toMatch(/[AEIOUY0-9]/);
        }
    });

    it('should normalize case, whitespace and dashes', () => {
        expect(normalizeDeviceUserCode(' bcdf-ghjk ')).toEqual('BCDFGHJK');
        expect(normalizeDeviceUserCode('BCDF GHJK')).toEqual('BCDFGHJK');
        expect(normalizeDeviceUserCode('bcdfghjk')).toEqual('BCDFGHJK');
    });

    it('should refuse a malformed code', () => {
        expect(normalizeDeviceUserCode('WDJB-MJH')).toBeNull();
        expect(normalizeDeviceUserCode('BCDF-GHJA')).toBeNull();
        expect(normalizeDeviceUserCode('BCDF-GHJ1')).toBeNull();
        expect(normalizeDeviceUserCode('BCDF-GHJK-L')).toBeNull();
        expect(normalizeDeviceUserCode('')).toBeNull();
    });

    it('should format a canonical code as two groups of four', () => {
        expect(formatDeviceUserCode('BCDFGHJK')).toEqual('BCDF-GHJK');
        expect(normalizeDeviceUserCode(formatDeviceUserCode(generateDeviceUserCode()))).not.toBeNull();
    });
});
