/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// Translation catalogs, key/namespace enums, and the locale registry now
// live in the framework-agnostic `@authup/i18n` package. Re-exported here
// so existing kit consumers (`../../../core`) keep their imports.
export * from '@authup/i18n';
