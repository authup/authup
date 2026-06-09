/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationCommonKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationCommonFrench : NamespaceTranslations<`${TranslatorTranslationCommonKey}`> = {
    [TranslatorTranslationCommonKey.GENERAL]: 'Général',
    [TranslatorTranslationCommonKey.OVERVIEW]: 'Aperçu',
    [TranslatorTranslationCommonKey.LOADING]: 'Chargement...',
    [TranslatorTranslationCommonKey.ACTIVE]: 'Actif',
    [TranslatorTranslationCommonKey.INACTIVE]: 'Inactif',
    [TranslatorTranslationCommonKey.LOCKED]: 'Verrouillé',
    [TranslatorTranslationCommonKey.NOT_LOCKED]: 'Non verrouillé',
    [TranslatorTranslationCommonKey.APPLICATION]: 'Application',
    [TranslatorTranslationCommonKey.SEARCH]: 'Rechercher',
    [TranslatorTranslationCommonKey.NO_RESULTS]: 'Aucun résultat trouvé.',
};
