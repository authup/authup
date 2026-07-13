/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationMailKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationMailSpanish : NamespaceTranslations<`${TranslatorTranslationMailKey}`> = {
    [TranslatorTranslationMailKey.CODE]: 'Código',

    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_SUBJECT]: 'Activa tu cuenta',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_INTRO]: 'Usa el código de abajo para activar tu cuenta y empezar a usar la plataforma.',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_ACTION]: 'Activar cuenta',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_HINT]: 'Si no creaste una cuenta, puedes ignorar este correo.',

    [TranslatorTranslationMailKey.PASSWORD_RESET_SUBJECT]: 'Restablece tu contraseña',
    [TranslatorTranslationMailKey.PASSWORD_RESET_INTRO]: 'Usa el código de abajo para restablecer la contraseña de tu cuenta.',
    [TranslatorTranslationMailKey.PASSWORD_RESET_ACTION]: 'Restablecer contraseña',
    [TranslatorTranslationMailKey.PASSWORD_RESET_EXPIRY]: 'El código caduca en {{minutes}} minutos.',
    [TranslatorTranslationMailKey.PASSWORD_RESET_HINT]: 'Si no solicitaste restablecer la contraseña, puedes ignorar este correo: tu contraseña no cambiará.',

    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_SUBJECT]: 'Tu código de verificación',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_INTRO]: 'Usa el código de abajo para completar tu inicio de sesión.',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_EXPIRY]: 'El código caduca en {{minutes}} minutos.',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_HINT]: 'Si no intentaste iniciar sesión, puedes ignorar este correo.',
};
