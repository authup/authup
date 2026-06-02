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
import { TranslatorTranslationGroup } from './constants';
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
 * Two-stage install: `@ilingo/vue` first (provides the `Ilingo`
 * instance + locale `Ref` and registers the authup catalogs), then
 * `@ilingo/validup-vue` (which looks the instance up via inject and
 * registers its built-in EN/DE/FR/ES validation-message catalogs onto
 * it).
 *
 * Authup-specific catalogs (`authupClient`, `default`, `vuecs`) ship
 * through the same `MemoryStore` — the descriptor-tree shape required
 * by ilingo 6 is built via `defineCatalog` / `defineLocale` /
 * `defineNamespace` / `defineTranslations` so the type system tracks
 * the namespace tree and a misspelled namespace name is a compile
 * error.
 *
 * Migrated from the previous `@ilingo/vuelidate`-based install when
 * authup's frontend moved off `vuelidate` to `@validup/vue`.
 */
export function installTranslator(app: App, options: TranslatorInstallOptions = {}) {
    const catalog = defineCatalog([
        defineLocale('en', [
            defineNamespace(TranslatorTranslationGroup.CLIENT, [
                defineTranslations(TranslatorTranslationClientEnglish),
            ]),
            defineNamespace(TranslatorTranslationGroup.DEFAULT, [
                defineTranslations(TranslatorTranslationDefaultEnglish),
            ]),
            defineNamespace(TranslatorTranslationGroup.VUECS, [
                defineTranslations(TranslatorTranslationVuecsEnglish),
            ]),
        ]),
        defineLocale('de', [
            defineNamespace(TranslatorTranslationGroup.CLIENT, [
                defineTranslations(TranslatorTranslationClientGerman),
            ]),
            defineNamespace(TranslatorTranslationGroup.DEFAULT, [
                defineTranslations(TranslatorTranslationDefaultGerman),
            ]),
            defineNamespace(TranslatorTranslationGroup.VUECS, [
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
