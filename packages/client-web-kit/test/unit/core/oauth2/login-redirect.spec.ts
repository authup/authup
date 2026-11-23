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
} from 'vitest';
import {
    LOGIN_REDIRECT_STORAGE_KEY,
    loadLoginRedirect,
    resolveLoginRedirect,
    saveLoginRedirect,
} from '../../../../src/index.ts';

describe('core/oauth2/login-redirect', () => {
    afterEach(() => {
        sessionStorage.clear();
    });

    describe('resolveLoginRedirect', () => {
        it.each([
            ['/users', '/users'],
            ['/users?page=2#row-7', '/users?page=2#row-7'],
            ['users', '/users'],
            ['/login-history', '/login-history'],
            ['/logouts', '/logouts'],
        ])('accepts the site-relative path %j', (value, expected) => {
            expect(resolveLoginRedirect(value)).toEqual(expected);
        });

        it.each([
            undefined,
            null,
            42,
            '',
            '//evil.test/x',
            '/.//evil.test/x',
            '/a/..//evil.test/x',
            '/\\evil.test/x',
            'https://evil.test/x',
            ['java', 'script:alert(1)'].join(''),
            'mailto:a@evil.test',
        ])('refuses %j', (value) => {
            expect(resolveLoginRedirect(value)).toBeUndefined();
        });

        it.each([
            '/login',
            '/login/',
            '/login?redirect=%2Fusers',
            '/login/callback?code=x',
            '/LOGIN',
            '/logout',
            '/logout?redirect=%2F',
            '/logout/done',
        ])('refuses the login or logout route %j', (value) => {
            expect(resolveLoginRedirect(value)).toBeUndefined();
        });

        it('refuses a login route under another prefix', () => {
            expect(resolveLoginRedirect('/auth/sign-in', { loginPath: '/auth/sign-in/' })).toBeUndefined();
            expect(resolveLoginRedirect('/auth/sign-in/callback', { loginPath: '/auth/sign-in' })).toBeUndefined();
            expect(resolveLoginRedirect('/login', { loginPath: '/auth/sign-in' })).toEqual('/login');
        });
    });

    describe('saveLoginRedirect / loadLoginRedirect', () => {
        it('round-trips a destination once', () => {
            saveLoginRedirect('/users?page=2');

            expect(sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY)).toEqual('/users?page=2');
            expect(loadLoginRedirect()).toEqual('/users?page=2');
            expect(loadLoginRedirect()).toBeUndefined();
        });

        it('clears a stale destination when the new one is refused', () => {
            saveLoginRedirect('/users');
            saveLoginRedirect('https://evil.test/');

            expect(loadLoginRedirect()).toBeUndefined();
        });

        it('re-validates what it reads back', () => {
            sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, '//evil.test/');

            expect(loadLoginRedirect()).toBeUndefined();
            expect(sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY)).toBeNull();
        });

        it('keeps stashes under different keys apart', () => {
            saveLoginRedirect('/roles', { storageKey: 'app:redirect' });

            expect(loadLoginRedirect()).toBeUndefined();
            expect(loadLoginRedirect({ storageKey: 'app:redirect' })).toEqual('/roles');
        });

        it('degrades when reading sessionStorage itself throws', () => {
            const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');

            Object.defineProperty(globalThis, 'sessionStorage', {
                configurable: true,
                get() {
                    throw new DOMException('blocked', 'SecurityError');
                },
            });

            try {
                expect(() => saveLoginRedirect('/roles')).not.toThrow();
                expect(loadLoginRedirect()).toBeUndefined();
            } finally {
                Object.defineProperty(globalThis, 'sessionStorage', descriptor as PropertyDescriptor);
            }
        });
    });
});
