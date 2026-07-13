/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationMailKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationMailFrench : NamespaceTranslations<`${TranslatorTranslationMailKey}`> = {
    [TranslatorTranslationMailKey.CODE]: 'Code',

    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_SUBJECT]: 'Activez votre compte',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_INTRO]: 'Utilisez le code ci-dessous pour activer votre compte et commencer à utiliser la plateforme.',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_ACTION]: 'Activer le compte',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_HINT]: 'Si vous n\'avez pas créé de compte, vous pouvez ignorer cet e-mail.',

    [TranslatorTranslationMailKey.PASSWORD_RESET_SUBJECT]: 'Réinitialisez votre mot de passe',
    [TranslatorTranslationMailKey.PASSWORD_RESET_INTRO]: 'Utilisez le code ci-dessous pour réinitialiser le mot de passe de votre compte.',
    [TranslatorTranslationMailKey.PASSWORD_RESET_ACTION]: 'Réinitialiser le mot de passe',
    [TranslatorTranslationMailKey.PASSWORD_RESET_EXPIRY]: 'Le code expire dans {{minutes}} minutes.',
    [TranslatorTranslationMailKey.PASSWORD_RESET_HINT]: 'Si vous n\'avez pas demandé de réinitialisation, vous pouvez ignorer cet e-mail – votre mot de passe reste inchangé.',

    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_SUBJECT]: 'Votre code de vérification',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_INTRO]: 'Utilisez le code ci-dessous pour finaliser votre connexion.',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_EXPIRY]: 'Le code expire dans {{minutes}} minutes.',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_HINT]: 'Si vous n\'avez pas tenté de vous connecter, vous pouvez ignorer cet e-mail.',
};
