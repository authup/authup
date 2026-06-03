/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    MemoryStore,
    defineCatalog,
    defineLocale,
    defineNamespace,
    defineTranslations,
} from 'ilingo';
import { install as installIlingoVue } from '@ilingo/vue';
import type { App } from 'vue';
import { TranslatorTranslationNamespace } from './constants';
import {
    TranslatorTranslationClientGerman,
    TranslatorTranslationDefaultGerman,
    TranslatorTranslationVuecsGerman,
} from './de';
import {
    TranslatorTranslationClientEnglish,
    TranslatorTranslationDefaultEnglish,
    TranslatorTranslationVuecsEnglish,
} from './en';
import type { TranslatorInstallOptions } from './types';

/**
 * Single-stage install: registers `@ilingo/vue` with the authup catalog.
 *
 * Authup-specific catalogs (`authupClient`, `default`, `vuecs`) ship
 * through the same `MemoryStore` — the descriptor-tree shape required
 * by ilingo 6 is built via `defineCatalog` / `defineLocale` /
 * `defineNamespace` / `defineTranslations` so the type system tracks
 * the namespace tree and a misspelled namespace name is a compile
 * error.
 *
 * `@ilingo/validup-vue`'s install is intentionally NOT called. It
 * registers a `validup` namespace catalog that maps `value_invalid`
 * → "The value is invalid". `@validup/adapter-zod@0.2.4` (latest) never
 * assigns a specific issue code when building issues from zod errors
 * — every failure ends up with `code: 'value_invalid'` — so registering
 * the catalog produces the generic "The value is invalid" on every
 * field regardless of which zod constraint actually failed.
 *
 * Without the validup catalog, `translateIssue` finds no translation
 * for `value_invalid` and falls back to `issue.message`, which carries
 * zod's specific text ("String must contain at least 3 characters",
 * "Required", "Invalid email", …). Authup gets meaningful messages out
 * of the box.
 *
 * Re-enable `installIlingoValidup` once `@validup/adapter-zod` maps zod
 * codes to validup codes (tracked upstream); at that point the catalog
 * provides translatable, parameterized messages and the fallback path
 * is rarely hit.
 *
 * Migrated from the previous `@ilingo/vuelidate`-based install when
 * authup's frontend moved off `vuelidate` to `@validup/vue`.
 */
export function installTranslator(app: App, options: TranslatorInstallOptions = {}) {
    const catalog = defineCatalog([
        defineLocale('en', [
            defineNamespace(TranslatorTranslationNamespace.CLIENT, [
                defineTranslations(TranslatorTranslationClientEnglish),
            ]),
            defineNamespace(TranslatorTranslationNamespace.DEFAULT, [
                defineTranslations(TranslatorTranslationDefaultEnglish),
            ]),
            defineNamespace(TranslatorTranslationNamespace.VUECS, [
                defineTranslations(TranslatorTranslationVuecsEnglish),
            ]),
        ]),
        defineLocale('de', [
            defineNamespace(TranslatorTranslationNamespace.CLIENT, [
                defineTranslations(TranslatorTranslationClientGerman),
            ]),
            defineNamespace(TranslatorTranslationNamespace.DEFAULT, [
                defineTranslations(TranslatorTranslationDefaultGerman),
            ]),
            defineNamespace(TranslatorTranslationNamespace.VUECS, [
                defineTranslations(TranslatorTranslationVuecsGerman),
            ]),
        ]),
    ]);

    installIlingoVue(app, {
        store: new MemoryStore({ data: catalog }),
        locale: options.locale,
    });
}
