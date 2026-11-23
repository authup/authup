/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationVuecsKey } from '../../constants.ts';
import type { NamespaceTranslations } from '../../types.ts';

export const TranslatorTranslationVuecsSpanish : NamespaceTranslations<`${TranslatorTranslationVuecsKey}`> = {
    [TranslatorTranslationVuecsKey.NO_MORE]: 'No hay más {{name}} disponibles',
    [TranslatorTranslationVuecsKey.NO_RESULTS_TITLE]: 'Sin resultados',
    [TranslatorTranslationVuecsKey.NO_RESULTS_DESCRIPTION]: 'Prueba a ajustar la búsqueda o los filtros.',
};
