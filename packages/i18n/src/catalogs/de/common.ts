/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationCommonKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationCommonGerman : NamespaceTranslations<`${TranslatorTranslationCommonKey}`> = {
    [TranslatorTranslationCommonKey.GENERAL]: 'Allgemein',
    [TranslatorTranslationCommonKey.OVERVIEW]: 'Überblick',
    [TranslatorTranslationCommonKey.LOADING]: 'Wird geladen...',
    [TranslatorTranslationCommonKey.ACTIVE]: 'Aktiv',
    [TranslatorTranslationCommonKey.INACTIVE]: 'Inaktiv',
    [TranslatorTranslationCommonKey.LOCKED]: 'Gesperrt',
    [TranslatorTranslationCommonKey.NOT_LOCKED]: 'Nicht gesperrt',
    [TranslatorTranslationCommonKey.APPLICATION]: 'Anwendung',
    [TranslatorTranslationCommonKey.SEARCH]: 'Suchen',
    [TranslatorTranslationCommonKey.NO_RESULTS]: 'Keine Ergebnisse gefunden.',
    [TranslatorTranslationCommonKey.SWITCH_TO_LIGHT_MODE]: 'Zum hellen Modus wechseln',
    [TranslatorTranslationCommonKey.SWITCH_TO_DARK_MODE]: 'Zum dunklen Modus wechseln',
};
