/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectHeadContent, stampDocumentTitle } from '../shared/index.ts';
import { escapeHtml } from './contract/index.ts';
import type { IThemeProvider } from './types.ts';

/**
 * Apply the operator theme to a rendered console shell. A no-op when
 * theming is off or the directory carries no manifest, so both console
 * serve paths can call it unconditionally.
 *
 * Lives outside contract/ because it takes a provider (filesystem-backed)
 * and splices into a served document: contract/ stays a pure description
 * of what a theme IS.
 */
export async function applyTheme(
    html: string,
    provider: IThemeProvider | undefined,
    basePath: string,
) : Promise<string> {
    if (!provider) {
        return html;
    }

    let body = html;

    // A directory may carry only a fragment, or only a stylesheet, so the
    // manifest is not a precondition for applying the theme.
    const manifest = await provider.getManifest();
    if (manifest?.title) {
        body = stampDocumentTitle(body, escapeHtml(manifest.title));
    }

    const head = await provider.getHead(basePath);
    if (head) {
        body = injectHeadContent(body, head);
    }

    return body;
}
