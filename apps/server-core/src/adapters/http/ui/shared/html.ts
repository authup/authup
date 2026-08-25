/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestCookie } from '@routup/basic/cookie';
import type { IAppEvent } from 'routup';
import { LOCALE_COOKIE } from '../../request/helpers/locale.ts';

const COLOR_MODE_COOKIE = 'vc-color-mode';

export type UIClientPreferences = {
    locale?: string,
    colorMode?: string,
};

/**
 * Mirror @vuecs/nuxt's SSR plugins: resolve the shared cookies server-side
 * so the HTML shell already carries the `.dark`/`.light` class and lang
 * attribute (no flash) and the client app hydrates from the same values.
 * The cookies are shared between every console on the origin.
 */
export function readUIClientPreferences(event: IAppEvent) : UIClientPreferences {
    return {
        locale: useRequestCookie(event, LOCALE_COOKIE),
        colorMode: useRequestCookie(event, COLOR_MODE_COOKIE),
    };
}

/**
 * Stamp the resolved preferences onto the opening `<html>` tag. Matched by
 * pattern rather than an exact literal, so a reformatted tag / dev-mode
 * transformIndexHtml rewrite still gets the lang + color-mode attributes
 * (no silent FOUC).
 */
export function stampHtmlAttributes(html: string, preferences: UIClientPreferences) : string {
    let htmlAttrs = 'lang="en"';
    if (preferences.locale && /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/.test(preferences.locale)) {
        htmlAttrs = `lang="${preferences.locale}"`;
    }
    if (preferences.colorMode === 'dark' || preferences.colorMode === 'light') {
        htmlAttrs += ` class="${preferences.colorMode}"`;
    }

    return html.replace(/<html\b[^>]*>/i, () => `<html ${htmlAttrs}>`);
}

/**
 * Replace a template marker (`<!--app-html-->`, `<!--account-config-->`, ...)
 * with a rendered value.
 *
 * The replacement is passed as a FUNCTION on purpose. A string replacement
 * expands the `$&`, `` $` ``, `$'` and `$$` patterns, so a `$'` anywhere in
 * the value splices the template's own text back into the page. The values
 * spliced here carry raw request input (the SSR hydration payload reflects
 * query parameters), which made `?token=$'` return a page whose inline
 * payload script was no longer valid JavaScript. Escaping cannot prevent
 * this: the expansion happens after the value was built.
 */
export function replaceTemplateMarker(html: string, marker: string, value: string) : string {
    return html.replace(marker, () => value);
}

/**
 * Insert markup immediately before `</head>`.
 *
 * Deliberately not a template marker: injecting at the closing tag works
 * against console bundles that were built BEFORE this feature existed, so
 * server-core never silently loses theming when it runs against an older
 * console package. A shell without a `</head>` is returned unchanged.
 *
 * Function-replacement form for the same reason as replaceTemplateMarker.
 */
export function injectHeadContent(html: string, content: string) : string {
    if (!content) {
        return html;
    }

    const index = html.toLowerCase().indexOf('</head>');
    if (index === -1) {
        return html;
    }

    return html.slice(0, index) + content + html.slice(index);
}

/**
 * Replace the document title. The value must already be HTML-escaped by
 * the caller; matched by pattern so a reformatted tag still hits.
 */
export function stampDocumentTitle(html: string, title: string) : string {
    return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, () => `<title>${title}</title>`);
}

/**
 * Response headers every served console page shares.
 *
 * Clickjacking guard: the pages mutate state behind explicit clicks and
 * hydrate first-party session state, so framing them would make
 * click-gating defeatable via overlay attacks — deny embedding entirely
 * (iframe-based silent renew is therefore unsupported). The URLs routinely
 * carry sensitive query params (id_token_hint, code, redirect, state) —
 * never leak them via Referer.
 */
export function applyUIPageHeaders(event: IAppEvent) : void {
    event.response.headers.set('content-type', 'text/html; charset=utf-8');
    // The shell is stamped from the vc-locale / vc-color-mode cookies, so
    // it genuinely varies by them. It carried no Vary header at all.
    event.response.headers.set('vary', 'cookie');
    event.response.headers.set('content-security-policy', "frame-ancestors 'none'");
    event.response.headers.set('x-frame-options', 'DENY');
    event.response.headers.set('referrer-policy', 'no-referrer');
    // Login pages, and the federated callback's interstitial carries a
    // fresh authorization code in its payload.
    event.response.headers.set('cache-control', 'no-store');
}

/**
 * Rewrite root-absolute asset references (script/link/preload tags emitted
 * with a fixed vite base, e.g. /console/auth/ or /console/account/)
 * so they carry the path prefix under which authup is publicly served (e.g.
 * /auth/console/auth/assets/...).
 * The reverse proxy is expected to strip the prefix before the request
 * reaches authup, so the assets middleware keeps serving at the fixed base.
 */
export function rebaseAssetURLs(html: string, basePath: string, viteBase: string) : string {
    if (!basePath) {
        return html;
    }

    return html.replace(
        new RegExp(`(src|href)="${viteBase.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`, 'g'),
        (_match, attribute) => `${attribute}="${basePath}${viteBase}`,
    );
}

/**
 * Escape characters that would otherwise let a value break out of an inline
 * `<script>` context (`</script>`) or terminate the JS string literal via
 * the U+2028/U+2029 line separators. Every window-global config/payload a
 * console page inlines must pass through this — never rely on the VALUES
 * staying benign.
 */
export function serializeInlineScriptJSON(value: unknown) : string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
