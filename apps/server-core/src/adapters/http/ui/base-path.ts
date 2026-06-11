/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Rewrite root-absolute /public/ asset references (script/link/preload tags
 * emitted with the fixed vite base) so they carry the path prefix under which
 * authup is publicly served (e.g. /auth/public/...). The reverse proxy is
 * expected to strip the prefix before the request reaches authup, so the
 * assets middleware keeps serving at /public.
 */
export function rebasePublicAssetURLs(html: string, basePath: string) : string {
    if (!basePath) {
        return html;
    }

    return html.replace(/(src|href)="\/public\//g, `$1="${basePath}/public/`);
}
