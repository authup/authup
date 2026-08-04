/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    THEME_ASSETS_DIRECTORY_NAME,
    THEME_ASSET_MOUNT_PATH,
    THEME_CSS_LAYER_NAME,
    THEME_LOGO_TOKENS,
} from './constants.ts';
import type { ThemeManifest } from './types.ts';

export function escapeHtml(value: string) : string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Turn a manifest asset path (`assets/logo.svg`) into the href it is
 * served under.
 *
 * Built with the base path up front rather than via rebaseAssetURLs, which
 * only rewrites the fixed `/public/` and `/account/` vite bases.
 */
function buildAssetURL(assetPath: string, basePath: string) : string {
    const name = assetPath.slice(`${THEME_ASSETS_DIRECTORY_NAME}/`.length);

    return `${basePath}/${THEME_ASSET_MOUNT_PATH}/${name}`;
}

function buildTokenRule(selector: string, tokens: Record<string, string>) : string {
    const declarations = Object.keys(tokens)
        .map((name) => `${name}:${tokens[name]}`)
        .join(';');

    return `${selector}{${declarations}}`;
}

/**
 * The `<style>`/`<link>` block injected before `</head>`.
 *
 * Every value here has already passed the manifest grammar (no `<`, `>`,
 * `}`, `;` or `@` in a token value; asset paths are alphanumeric plus
 * `._/-`), so the emitted CSS cannot be broken out of. The title is the
 * one free-form field and is HTML-escaped.
 */
export function buildThemeHead(
    manifest: ThemeManifest,
    basePath: string,
    fragment?: string,
) : string {
    const parts : string[] = [];

    const rules : string[] = [];

    // The logo is a manifest field rather than a raw token because its
    // value needs url(), which the token grammar forbids. Merged under
    // :root so an explicit token of the same name still wins.
    const tokens : Record<string, string> = {};
    if (manifest.logo) {
        const url = buildAssetURL(manifest.logo, basePath);
        for (const pair of THEME_LOGO_TOKENS) {
            tokens[pair.image] = `url("${url}")`;
            tokens[pair.markVisibility] = 'hidden';
        }
    }
    Object.assign(tokens, manifest.tokens);

    if (Object.keys(tokens).length > 0) {
        rules.push(buildTokenRule(':root', tokens));
    }
    // After :root, so it wins inside the layer by source order and the
    // color-mode switcher keeps working.
    if (manifest.tokensDark && Object.keys(manifest.tokensDark).length > 0) {
        rules.push(buildTokenRule('.dark', manifest.tokensDark));
    }

    if (rules.length > 0) {
        parts.push(`<style>@layer ${THEME_CSS_LAYER_NAME}{${rules.join('')}}</style>`);
    }

    if (manifest.favicon) {
        parts.push(`<link rel="icon" href="${escapeHtml(buildAssetURL(manifest.favicon, basePath))}">`);
    }

    // Last, so the operator stylesheet wins over the token block above it.
    if (manifest.stylesheet) {
        parts.push(`<link rel="stylesheet" href="${escapeHtml(buildAssetURL(manifest.stylesheet, basePath))}">`);
    }

    // After the stylesheet, so a fragment can override everything the
    // manifest emitted. Passed through verbatim: it is operator-authored
    // markup, and a partial sanitizer would be worse than none because it
    // invites treating fragments as untrusted-safe. The controls are that
    // it is filesystem-only, off by default, and head-only.
    if (fragment) {
        parts.push(fragment);
    }

    return parts.join('');
}
