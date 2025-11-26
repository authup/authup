/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isSimpleMatch } from '../../src';

describe('is-simple-match', () => {
    it('should match equal string', () => {
        expect(isSimpleMatch('test', 'test')).toBeTruthy();
    });

    it('should match with single glob', () => {
        expect(isSimpleMatch('foo', '*')).toBeTruthy();
        expect(isSimpleMatch('test', 'test/*')).toBeTruthy();
        expect(isSimpleMatch('test/foo', 'test/*')).toBeTruthy();
        expect(isSimpleMatch('test/', 'test/*')).toBeTruthy();
    });

    it('should not match with single glob', () => {
        expect(isSimpleMatch('test/foo/bar', 'test/*')).toBeFalsy();
    });

    it('should match with glob star', () => {
        expect(isSimpleMatch('test/foo', '**')).toBeTruthy();
        expect(isSimpleMatch('test', 'test/**')).toBeTruthy();
        expect(isSimpleMatch('test/foo/bar', 'test/**')).toBeTruthy();
        expect(isSimpleMatch('test/', 'test/**')).toBeTruthy();
    });

    it('should not match with glob star', () => {
        expect(isSimpleMatch('baz', 'test/**')).toBeFalsy();
    });
});
