/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import path from 'node:path';
import { z } from 'zod';
import {
    THEME_ASSETS_DIRECTORY_NAME,
    THEME_ASSET_EXTENSIONS,
    THEME_MANIFEST_VERSION,
    THEME_TOKEN_NAME_PATTERN,
    THEME_TOKEN_VALUE_FORBIDDEN_PATTERN,
    THEME_TOKEN_VALUE_MAX_LENGTH,
} from './constants.ts';
import type { ThemeManifest } from './types.ts';

const assetPathSchema = z.string()
    .regex(
        new RegExp(`^${THEME_ASSETS_DIRECTORY_NAME}/[a-zA-Z0-9][a-zA-Z0-9._/-]*$`),
        `must be a path inside '${THEME_ASSETS_DIRECTORY_NAME}/'`,
    )
    .refine(
        (value) => !value.split('/').includes('..'),
        'must not contain a ".." segment',
    )
    .refine(
        (value) => (THEME_ASSET_EXTENSIONS as readonly string[])
            .includes(path.extname(value).toLowerCase()),
        `must end in one of: ${THEME_ASSET_EXTENSIONS.join(', ')}`,
    );

const tokenMapSchema = z.record(
    z.string().regex(
        THEME_TOKEN_NAME_PATTERN,
        'must be a lowercase CSS custom property name (e.g. --authup-auth-accent)',
    ),
    z.string()
        .min(1)
        .max(THEME_TOKEN_VALUE_MAX_LENGTH)
        .refine(
            (value) => !THEME_TOKEN_VALUE_FORBIDDEN_PATTERN.test(value),
            'must not contain }, <, >, ;, @, \\, /*, url( or expression(',
        ),
);

/**
 * `.strict()` on purpose: an unknown key is a typo, and the dominant
 * failure mode of this whole feature is silence. A misspelled
 * `stylesheets` that quietly does nothing is worse than a boot that names
 * the offending key.
 */
export const themeManifestSchema = z.object({
    version: z.literal(THEME_MANIFEST_VERSION),
    title: z.string().min(1).max(200).optional(),
    favicon: assetPathSchema.optional(),
    stylesheet: assetPathSchema.optional(),
    tokens: tokenMapSchema.optional(),
    tokensDark: tokenMapSchema.optional(),
}).strict();

/**
 * Validate a parsed `theme.json`. On failure the thrown error names the
 * file and renders every issue as `<path>: <message>`, matching
 * FileProvisioningSource: a bad entry must never abort a boot with nothing
 * to act on.
 */
export function parseThemeManifest(input: unknown, filePath: string) : ThemeManifest {
    const result = themeManifestSchema.safeParse(input);
    if (result.success) {
        return result.data;
    }

    const issues = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('\n');

    throw new AuthupError(`The theme manifest "${filePath}" is invalid.\n${issues}`);
}
