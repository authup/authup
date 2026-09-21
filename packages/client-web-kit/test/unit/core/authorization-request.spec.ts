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
import { buildAuthorizeURL } from '../../../src';

const CONTEXT = {
    baseURL: 'https://auth.example.com',
    clientId: 'admin-console',
    redirectUri: 'https://app.example.com/login/callback',
    state: 'STATE',
    codeChallenge: 'CHALLENGE',
    codeChallengeMethod: 'S256',
};

function setCookie(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/`;
}

afterEach(() => {
    document.cookie = 'vc-locale=; path=/; max-age=0';
    document.cookie = 'vc-color-mode=; path=/; max-age=0';
});

describe('buildAuthorizeURL', () => {
    it('sends no hint while the visitor has chosen nothing', () => {
        const params = new URL(buildAuthorizeURL(CONTEXT)).searchParams;

        expect(params.get('ui_locales')).toBeNull();
        expect(params.get('ui_color_mode')).toBeNull();
    });

    // `auto` / `system` are what the two switchers leave untouched, and the
    // hosted pages resolve them from the same browser, so sending one would
    // say nothing they do not already know.
    it('sends no hint for the no-choice sentinels', () => {
        setCookie('vc-locale', 'auto');
        setCookie('vc-color-mode', 'system');

        const params = new URL(buildAuthorizeURL(CONTEXT)).searchParams;

        expect(params.get('ui_locales')).toBeNull();
        expect(params.get('ui_color_mode')).toBeNull();
    });

    // The point of the default: a consumer that wires nothing still carries
    // what the visitor picked into the hosted pages.
    it('defaults both hints from the preference cookies', () => {
        setCookie('vc-locale', 'fr');
        setCookie('vc-color-mode', 'dark');

        const params = new URL(buildAuthorizeURL(CONTEXT)).searchParams;

        expect(params.get('ui_locales')).toEqual('fr');
        expect(params.get('ui_color_mode')).toEqual('dark');
    });

    it('lets the caller override what the cookie says', () => {
        setCookie('vc-locale', 'fr');

        const params = new URL(buildAuthorizeURL({ ...CONTEXT, uiLocales: 'es' })).searchParams;

        expect(params.get('ui_locales')).toEqual('es');
    });

    // the `prompt` convention this function already documents
    it('lets the caller opt out with an empty string', () => {
        setCookie('vc-locale', 'fr');
        setCookie('vc-color-mode', 'dark');

        const params = new URL(buildAuthorizeURL({
            ...CONTEXT,
            uiLocales: '',
            uiColorMode: '',
        })).searchParams;

        expect(params.get('ui_locales')).toBeNull();
        expect(params.get('ui_color_mode')).toBeNull();
    });
});
