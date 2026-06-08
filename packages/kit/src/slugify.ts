/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Normalize an arbitrary string into a URL-friendly slug.
 *
 * Lowercases the input and splits on every run of non `[a-z0-9]` characters,
 * dropping empty segments (which also strips leading/trailing separators), then
 * joins the segments with a single hyphen. The result only contains `[a-z0-9-]`
 * and never starts/ends with a hyphen.
 *
 * Implemented with split/join rather than an anchored `^-+|-+$` trim to avoid a
 * (super-)linear backtracking regex on inputs with many separators.
 */
export function slugify(value: string): string {
    return value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .join('-');
}
