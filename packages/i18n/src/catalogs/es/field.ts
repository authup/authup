/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationFieldKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationFieldSpanish : NamespaceTranslations<`${TranslatorTranslationFieldKey}`> = {
    [TranslatorTranslationFieldKey.NAME]: 'Nombre',
    [TranslatorTranslationFieldKey.DISPLAY_NAME]: 'Nombre para mostrar',
    [TranslatorTranslationFieldKey.EMAIL]: 'Correo electrónico',
    [TranslatorTranslationFieldKey.EXTERNAL_ID]: 'ID externo',
    [TranslatorTranslationFieldKey.DESCRIPTION]: 'Descripción',
    [TranslatorTranslationFieldKey.SECRET]: 'Secreto',
    [TranslatorTranslationFieldKey.REDIRECT_URIS]: 'URI(s) de redirección',
    [TranslatorTranslationFieldKey.PASSWORD]: 'Contraseña',
    [TranslatorTranslationFieldKey.DECISION_STRATEGY]: 'Estrategia de decisión',
    [TranslatorTranslationFieldKey.HASHED]: 'Con hash',
    [TranslatorTranslationFieldKey.URL]: 'URL',
    [TranslatorTranslationFieldKey.CLIENT_SCOPES]: 'Ámbitos del cliente',
    [TranslatorTranslationFieldKey.START]: 'Inicio',
    [TranslatorTranslationFieldKey.END]: 'Fin',
    [TranslatorTranslationFieldKey.INTERVAL]: 'Intervalo',
    [TranslatorTranslationFieldKey.DAY_OF_WEEK]: 'Día de la semana',
    [TranslatorTranslationFieldKey.DAY_OF_MONTH]: 'Día del mes',
    [TranslatorTranslationFieldKey.DAY_OF_YEAR]: 'Día del año',
    [TranslatorTranslationFieldKey.VALUE_IS_REGEX]: '¿Es el valor un patrón regex?',

    [TranslatorTranslationFieldKey.CODE]: 'Código',
};
