/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ErrorCode } from '@authup/errors';
import {
    type NamespaceChild,
    defineCatalog,
    defineLocale,
    defineNamespace,
    defineTranslations,
} from 'ilingo';
import type {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationVuecsKey,
} from '../constants';
import {
    TranslatorTranslationNamespace,
} from '../constants';
import type { NamespaceTranslations } from '../types';
import {
    TranslatorTranslationActionEnglish,
    TranslatorTranslationAppEnglish,
    TranslatorTranslationClientEnglish,
    TranslatorTranslationCommonEnglish,
    TranslatorTranslationEntityEnglish,
    TranslatorTranslationErrorEnglish,
    TranslatorTranslationFieldEnglish,
    TranslatorTranslationVuecsEnglish,
} from './en';
import {
    TranslatorTranslationActionGerman,
    TranslatorTranslationAppGerman,
    TranslatorTranslationClientGerman,
    TranslatorTranslationCommonGerman,
    TranslatorTranslationEntityGerman,
    TranslatorTranslationErrorGerman,
    TranslatorTranslationFieldGerman,
    TranslatorTranslationVuecsGerman,
} from './de';

export * from './en';
export * from './de';

/**
 * The complete set of namespaces a single authored locale must provide.
 * Every field is required and typed to its key union, so adding a locale
 * (or a namespace) without authoring all of them is a compile error —
 * the compile-time complement to the runtime locale-parity test.
 */
type LocaleNamespaces = {
    entity: NamespaceTranslations<`${TranslatorTranslationEntityKey}`>,
    field: NamespaceTranslations<`${TranslatorTranslationFieldKey}`>,
    action: NamespaceTranslations<`${TranslatorTranslationActionKey}`>,
    common: NamespaceTranslations<`${TranslatorTranslationCommonKey}`>,
    client: NamespaceTranslations<`${TranslatorTranslationClientKey}`>,
    app: NamespaceTranslations<`${TranslatorTranslationAppKey}`>,
    vuecs: NamespaceTranslations<`${TranslatorTranslationVuecsKey}`>,
    error: NamespaceTranslations<`${ErrorCode}`>,
};

/**
 * Assemble one locale into the ilingo descriptor tree. Centralising the
 * namespace wiring here means the namespace → translations mapping lives
 * in exactly one place; per-locale call sites only supply the data.
 */
function defineAuthupLocale(code: string, namespaces: LocaleNamespaces) {
    const children: NamespaceChild[] = [
        defineNamespace(TranslatorTranslationNamespace.ENTITY, [defineTranslations(namespaces.entity)]),
        defineNamespace(TranslatorTranslationNamespace.FIELD, [defineTranslations(namespaces.field)]),
        defineNamespace(TranslatorTranslationNamespace.ACTION, [defineTranslations(namespaces.action)]),
        defineNamespace(TranslatorTranslationNamespace.COMMON, [defineTranslations(namespaces.common)]),
        defineNamespace(TranslatorTranslationNamespace.CLIENT, [defineTranslations(namespaces.client)]),
        defineNamespace(TranslatorTranslationNamespace.APP, [defineTranslations(namespaces.app)]),
        defineNamespace(TranslatorTranslationNamespace.VUECS, [defineTranslations(namespaces.vuecs)]),
        defineNamespace(TranslatorTranslationNamespace.ERROR, [defineTranslations(namespaces.error)]),
    ];

    return defineLocale(code, children);
}

/**
 * Authored catalogs as an ilingo `CatalogNode` — the canonical ingestion
 * format consumed directly by `MemoryStore({ data })`. Built via ilingo's
 * own `define*` helpers so the descriptor shape (and namespace names) are
 * validated by ilingo's types rather than reconstructed by each consumer.
 *
 * Only locales present here are translated. `fr`/`es` are declared in
 * `LOCALES` (for the switcher + architecture) but not yet authored, so
 * they're absent here; ilingo's BCP-47 fallback resolves them to `en`
 * until a later phase fills them in. The locale-parity test walks this
 * node tree, so it only enforces parity over authored locales.
 *
 * Eager today; a later phase converts the per-locale values to a
 * `LoaderStore` with dynamic `import()` loaders so non-default locales
 * code-split out of the default bundle.
 */
export const CATALOGS = defineCatalog([
    defineAuthupLocale('en', {
        entity: TranslatorTranslationEntityEnglish,
        field: TranslatorTranslationFieldEnglish,
        action: TranslatorTranslationActionEnglish,
        common: TranslatorTranslationCommonEnglish,
        client: TranslatorTranslationClientEnglish,
        app: TranslatorTranslationAppEnglish,
        vuecs: TranslatorTranslationVuecsEnglish,
        error: TranslatorTranslationErrorEnglish,
    }),
    defineAuthupLocale('de', {
        entity: TranslatorTranslationEntityGerman,
        field: TranslatorTranslationFieldGerman,
        action: TranslatorTranslationActionGerman,
        common: TranslatorTranslationCommonGerman,
        client: TranslatorTranslationClientGerman,
        app: TranslatorTranslationAppGerman,
        vuecs: TranslatorTranslationVuecsGerman,
        error: TranslatorTranslationErrorGerman,
    }),
]);
