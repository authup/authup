/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocaleDescriptor } from './types';

/**
 * Locales authup ships translations for. `nativeName` is the language
 * name in its own language — what the language switcher should display.
 * Order is the display order in the switcher.
 *
 * All four (`en`, `de`, `fr`, `es`) are authored fully in `CATALOGS`;
 * the locale-parity test enforces that each provides exactly the
 * canonical key set per namespace. BCP-47 narrowing (`de-AT` → `de`)
 * plus the `DEFAULT_LOCALE` fallback still resolves any unauthored
 * variant to a supported base locale.
 */
export const LOCALES = [
    { code: 'en', nativeName: 'English' },
    { code: 'de', nativeName: 'Deutsch' },
    { code: 'fr', nativeName: 'Français' },
    { code: 'es', nativeName: 'Español' },
] as const satisfies readonly LocaleDescriptor[];

/**
 * Union of supported locale codes, derived from `LOCALES` so it can
 * never drift from the registry.
 */
export type LocaleCode = typeof LOCALES[number]['code'];

/**
 * Ultimate fallback locale. BCP-47 narrowing (`de-AT` → `de`) plus this
 * fallback (`→ en`) is handled by ilingo's resolver.
 */
export const DEFAULT_LOCALE: LocaleCode = 'en';

export const LOCALE_CODES: readonly LocaleCode[] = LOCALES.map((locale) => locale.code);

export function isLocale(input: unknown): input is LocaleCode {
    return typeof input === 'string' && (LOCALE_CODES as readonly string[]).includes(input);
}
