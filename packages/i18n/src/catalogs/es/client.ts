/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationClientKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationClientSpanish : NamespaceTranslations<`${TranslatorTranslationClientKey}`> = {
    [TranslatorTranslationClientKey.NAME_HINT]: 'Algo que los usuarios reconocerán y en lo que confiarán',
    [TranslatorTranslationClientKey.DESCRIPTION_HINT]: 'Se muestra a todos los usuarios de esta aplicación',
    [TranslatorTranslationClientKey.REDIRECT_URI_HINT]: 'Patrón de URI al que un navegador puede redirigir tras un inicio de sesión exitoso',
    [TranslatorTranslationClientKey.IS_CONFIDENTIAL]: '¿Es confidencial?',
    [TranslatorTranslationClientKey.IS_ACTIVE]: '¿Está activo?',
    [TranslatorTranslationClientKey.HASH_SECRET]: '¿Aplicar hash al secreto?',

    [TranslatorTranslationClientKey.LOGIN_FAILED]: 'La operación de inicio de sesión falló',
    [TranslatorTranslationClientKey.SCOPE_GRANT_INTRO]: 'Esto permitirá que la aplicación {{client}}',
    [TranslatorTranslationClientKey.ONCE_AUTHORIZED_REDIRECT]: 'Una vez autorizado, será redirigido a:',
    [TranslatorTranslationClientKey.GOVERNED_BY]: 'Esta aplicación se rige por la Política de Privacidad y los Términos de Servicio de la aplicación {{client}}.',
    [TranslatorTranslationClientKey.ACTIVE_SINCE]: 'Activo desde',
    [TranslatorTranslationClientKey.VIEW_POLICY_DETAILS]: 'Ver detalles de la política',
};
