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
    setAccountConsoleRef,
    useAccountConsoleRef,
} from '../../src/ref';

describe('account console ref stash', () => {
    beforeEach(() => {
        sessionStorage.clear();
        setAccountConsoleRef(undefined);
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

    it('should not seed the trusted ref from anything but an explicit set', () => {
        expect(useAccountConsoleRef().value).toBeUndefined();
    });

    it('should expose an explicitly set trusted ref', () => {
        setAccountConsoleRef('https://admin.example.com/');
        expect(useAccountConsoleRef().value).toEqual('https://admin.example.com/');
    });

    it('should clear the trusted ref when set to undefined', () => {
        setAccountConsoleRef('https://admin.example.com/');
        setAccountConsoleRef(undefined);
        expect(useAccountConsoleRef().value).toBeUndefined();
    });
});
