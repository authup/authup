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

    [TranslatorTranslationClientKey.CREATE_ACCOUNT]: 'Crear cuenta',
    [TranslatorTranslationClientKey.FORGOT_PASSWORD]: '¿Olvidaste la contraseña?',
    [TranslatorTranslationClientKey.RESET_PASSWORD]: 'Restablecer contraseña',
    [TranslatorTranslationClientKey.ACTIVATE_ACCOUNT]: 'Activar cuenta',
    [TranslatorTranslationClientKey.BACK_TO_LOGIN]: 'Volver al inicio de sesión',
    [TranslatorTranslationClientKey.EMAIL_OR_NAME]: 'Correo electrónico o nombre',
    [TranslatorTranslationClientKey.CHECK_EMAIL_ACTIVATE]: 'Revisa tu correo electrónico para obtener el código de activación.',
    [TranslatorTranslationClientKey.CHECK_EMAIL_RESET]: 'Revisa tu correo electrónico para obtener el código de restablecimiento.',
    [TranslatorTranslationClientKey.ACCOUNT_ACTIVATED]: 'La cuenta se activó correctamente.',
    [TranslatorTranslationClientKey.PASSWORD_RESET_DONE]: 'La contraseña se restableció correctamente.',
    [TranslatorTranslationClientKey.WORKFLOW_DISABLED]: 'Esta función no está habilitada.',
};
