/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Lowercased file extension of a theme-relative path, including the dot
 * (`assets/logo.SVG` -> `.svg`); empty when there is none.
 *
 * Hand-rolled rather than `node:path`'s extname so this folder stays free
 * of node APIs and can be consumed by a browser-side theme editor.
 * Manifest paths are always POSIX and already grammar-checked, so the
 * separator handling extname does is not needed here.
 */
export function themeAssetExtension(value: string) : string {
    const name = value.slice(value.lastIndexOf('/') + 1);
    const index = name.lastIndexOf('.');

    if (index <= 0) {
        return '';
    }

    return name.slice(index).toLowerCase();
}
