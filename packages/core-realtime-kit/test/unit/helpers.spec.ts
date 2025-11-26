/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    describe, expect, it,
} from 'vitest';
import { isEventCallback, isEventTarget } from '../../src';

describe('src/helpers', () => {
    it('should detect event target', () => {
        expect(isEventTarget(1)).toBeTruthy();
        expect(isEventTarget('foo')).toBeTruthy();
        expect(isEventTarget(undefined)).toBeTruthy();
        expect(isEventTarget(null)).toBeFalsy();
    });

    it('should detect event callback', () => {
        expect(isEventCallback(() => undefined)).toBeTruthy();
        expect(isEventCallback(() => undefined, 2)).toBeFalsy();
    });
});
