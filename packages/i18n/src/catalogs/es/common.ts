/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationCommonKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationCommonSpanish : NamespaceTranslations<`${TranslatorTranslationCommonKey}`> = {
    [TranslatorTranslationCommonKey.GENERAL]: 'General',
    [TranslatorTranslationCommonKey.OVERVIEW]: 'Resumen',
    [TranslatorTranslationCommonKey.LOADING]: 'Cargando...',
    [TranslatorTranslationCommonKey.ACTIVE]: 'Activo',
    [TranslatorTranslationCommonKey.INACTIVE]: 'Inactivo',
    [TranslatorTranslationCommonKey.LOCKED]: 'Bloqueado',
    [TranslatorTranslationCommonKey.NOT_LOCKED]: 'No bloqueado',
    [TranslatorTranslationCommonKey.APPLICATION]: 'Aplicación',
};
