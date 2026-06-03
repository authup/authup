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
import { install as installIlingoValidup } from '@ilingo/validup-vue';
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
 * Three-stage install:
 *
 * 1. `@ilingo/vue` first (provides the `Ilingo` instance + locale `Ref`
 *    and registers the authup catalogs).
 * 2. `@ilingo/validup-vue` next (looks up the instance via inject and
 *    registers its built-in EN/DE/FR/ES validup validation-message
 *    catalogs onto it).
 *
 * `<IFieldValidation>` is imported and registered per-form locally
 * rather than globally — keeps the form's `components: {}` registry as
 * the single source of truth for what's used in its template.
 *
 * Authup-specific catalogs (`authupClient`, `default`, `vuecs`) ship
 * through the same `MemoryStore` — the descriptor-tree shape required
 * by ilingo 6 is built via `defineCatalog` / `defineLocale` /
 * `defineNamespace` / `defineTranslations` so the type system tracks
 * the namespace tree and a misspelled namespace name is a compile
 * error.
 *
 * **Known gap until `@validup/adapter-zod` ships the zod-code →
 * validup-code mapping** (source landed at tada5hi/validup@49df8fb,
 * not yet on npm — latest published is 0.2.4): the adapter emits every
 * zod issue as `code: 'value_invalid'`, which the validup catalog
 * resolves to "The value is invalid". Specific zod constraints
 * (min-length, max-length, required, email, …) won't surface until the
 * fixed adapter is published and bumped here. The `issue.message`
 * fallback path in `@ilingo/validup`'s `translateIssue` only fires
 * when the catalog has no entry for the code — which is not the case
 * for `value_invalid`. Tracked at tada5hi/validup#397.
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
    installIlingoValidup(app);
}
