/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { createValidator } from '@validup/zod';
import { Container, isValidupError, stringifyPath } from 'validup';
import { z } from 'zod';
import {
    THEME_ASSETS_DIRECTORY_NAME,
    THEME_ASSET_EXTENSIONS,
    THEME_IMAGE_EXTENSIONS,
    THEME_MANIFEST_VERSION,
    THEME_TOKEN_NAME_PATTERN,
    THEME_TOKEN_VALUE_FORBIDDEN_PATTERN,
    THEME_TOKEN_VALUE_MAX_LENGTH,
} from './constants';
import type { ThemeManifest } from './types';
import { themeAssetExtension } from './utils';

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
        (value) => THEME_ASSET_EXTENSIONS.includes(themeAssetExtension(value)),
        `must end in one of: ${THEME_ASSET_EXTENSIONS.join(', ')}`,
    );

/**
 * A logo must be an image. The general asset allowlist also covers CSS and
 * fonts, which would silently render as nothing here.
 */
const logoPathSchema = assetPathSchema.refine(
    (value) => THEME_IMAGE_EXTENSIONS.includes(themeAssetExtension(value)),
    `must be an image (${THEME_IMAGE_EXTENSIONS.join(', ')})`,
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
 * Validator for the operator-authored `theme.json`.
 *
 * A validup Container over zod mounts, matching ConfigValidator: this file
 * is config, not an API payload, and the config-shaped precedent in this
 * codebase is validup. It also means a second consumer (a per-realm token
 * map, an admin-console form, a CLI `theme validate`) reuses these rules
 * instead of restating them.
 *
 * No validator groups: there is one source and one shape. A per-realm
 * surface that accepts a narrower manifest than a file does would add one.
 */
export class ThemeManifestValidator extends Container<ThemeManifest> {
    protected override initialize() {
        super.initialize();

        this.mount('version', createValidator(z.literal(THEME_MANIFEST_VERSION)));
        this.mount('title', { optional: true }, createValidator(z.string().min(1).max(200)));
        this.mount('favicon', { optional: true }, createValidator(assetPathSchema));
        this.mount('logo', { optional: true }, createValidator(logoPathSchema));
        this.mount('logoDark', { optional: true }, createValidator(logoPathSchema));
        this.mount('stylesheet', { optional: true }, createValidator(assetPathSchema));
        this.mount('tokens', { optional: true }, createValidator(tokenMapSchema));
        this.mount('tokensDark', { optional: true }, createValidator(tokenMapSchema));
    }
}

const validator = new ThemeManifestValidator();

/**
 * Every key the validator mounts. Validup STRIPS an unmounted key rather
 * than rejecting it, and a silently-ignored `stylesheets` typo is the exact
 * failure mode this feature must not have, so unknown keys are rejected
 * explicitly before the run.
 */
const KNOWN_KEYS = [
    'version',
    'title',
    'favicon',
    'logo',
    'logoDark',
    'stylesheet',
    'tokens',
    'tokensDark',
];

/**
 * Validate a parsed `theme.json`. On failure the thrown error names the
 * file and renders every issue as `<path>: <message>`, matching
 * FileProvisioningSource: a bad entry must never abort a boot with nothing
 * to act on.
 */
export async function parseThemeManifest(input: unknown, filePath: string) : Promise<ThemeManifest> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new AuthupError(`The theme manifest "${filePath}" must contain an object at its root.`);
    }

    const unknown = Object.keys(input).filter((key) => !KNOWN_KEYS.includes(key));
    if (unknown.length > 0) {
        throw new AuthupError(
            `The theme manifest "${filePath}" is invalid.\n${unknown
                .map((key) => `  ${key}: unknown property`)
                .join('\n')}`,
        );
    }

    try {
        return await validator.run(input as Record<string, any>) as ThemeManifest;
    } catch (e) {
        if (!isValidupError(e)) {
            throw e;
        }

        const issues = e.issues
            .map((issue) => `  ${stringifyPath(issue.path)}: ${issue.message}`)
            .join('\n');

        throw new AuthupError(`The theme manifest "${filePath}" is invalid.\n${issues}`);
    }
}
