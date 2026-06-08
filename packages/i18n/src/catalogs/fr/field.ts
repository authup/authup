/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationFieldKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationFieldFrench : NamespaceTranslations<`${TranslatorTranslationFieldKey}`> = {
    [TranslatorTranslationFieldKey.NAME]: 'Nom',
    [TranslatorTranslationFieldKey.DISPLAY_NAME]: 'Nom d\'affichage',
    [TranslatorTranslationFieldKey.EMAIL]: 'E-mail',
    [TranslatorTranslationFieldKey.EXTERNAL_ID]: 'ID externe',
    [TranslatorTranslationFieldKey.DESCRIPTION]: 'Description',
    [TranslatorTranslationFieldKey.SECRET]: 'Secret',
    [TranslatorTranslationFieldKey.REDIRECT_URIS]: 'URI(s) de redirection',
    [TranslatorTranslationFieldKey.PASSWORD]: 'Mot de passe',
    [TranslatorTranslationFieldKey.DECISION_STRATEGY]: 'Stratégie de décision',
    [TranslatorTranslationFieldKey.HASHED]: 'Haché',
    [TranslatorTranslationFieldKey.URL]: 'URL',
    [TranslatorTranslationFieldKey.CLIENT_SCOPES]: 'Portées du client',
    [TranslatorTranslationFieldKey.START]: 'Début',
    [TranslatorTranslationFieldKey.END]: 'Fin',
    [TranslatorTranslationFieldKey.INTERVAL]: 'Intervalle',
    [TranslatorTranslationFieldKey.DAY_OF_WEEK]: 'Jour de la semaine',
    [TranslatorTranslationFieldKey.DAY_OF_MONTH]: 'Jour du mois',
    [TranslatorTranslationFieldKey.DAY_OF_YEAR]: 'Jour de l\'année',
    [TranslatorTranslationFieldKey.VALUE_IS_REGEX]: 'La valeur est-elle un motif regex ?',
};
