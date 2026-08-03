/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// @vitest-environment happy-dom

import { 
    beforeEach, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import {
    ACCOUNT_CONSOLE_REF_STORAGE_KEY,
    loadAccountConsoleRef,
    saveAccountConsoleRef,
} from '../../src/ref';

describe('account console ref stash', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('should round-trip a value', () => {
        saveAccountConsoleRef('https://admin.example.com/');
        expect(loadAccountConsoleRef()).toEqual('https://admin.example.com/');
    });

    it('should consume the value on read', () => {
        saveAccountConsoleRef('https://admin.example.com/');
        loadAccountConsoleRef();

        expect(loadAccountConsoleRef()).toBeUndefined();
        expect(sessionStorage.getItem(ACCOUNT_CONSOLE_REF_STORAGE_KEY)).toBeNull();
    });

    it('should return undefined when nothing was stashed', () => {
        expect(loadAccountConsoleRef()).toBeUndefined();
    });

    it('should clear the stash when saving undefined', () => {
        saveAccountConsoleRef('https://admin.example.com/');
        saveAccountConsoleRef(undefined);

        expect(sessionStorage.getItem(ACCOUNT_CONSOLE_REF_STORAGE_KEY)).toBeNull();
    });
});
