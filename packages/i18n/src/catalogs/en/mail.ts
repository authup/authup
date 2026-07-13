/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationMailKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationMailEnglish : NamespaceTranslations<`${TranslatorTranslationMailKey}`> = {
    [TranslatorTranslationMailKey.CODE]: 'Code',

    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_SUBJECT]: 'Activate your account',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_INTRO]: 'Use the code below to activate your account and start using the platform.',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_ACTION]: 'Activate account',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_HINT]: 'If you did not create an account, you can safely ignore this email.',

    [TranslatorTranslationMailKey.PASSWORD_RESET_SUBJECT]: 'Reset your password',
    [TranslatorTranslationMailKey.PASSWORD_RESET_INTRO]: 'Use the code below to reset your account password.',
    [TranslatorTranslationMailKey.PASSWORD_RESET_ACTION]: 'Reset password',
    [TranslatorTranslationMailKey.PASSWORD_RESET_EXPIRY]: 'The code expires in {{minutes}} minutes.',
    [TranslatorTranslationMailKey.PASSWORD_RESET_HINT]: 'If you did not request a password reset, you can safely ignore this email — your password stays unchanged.',

    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_SUBJECT]: 'Your verification code',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_INTRO]: 'Use the code below to complete your sign-in.',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_EXPIRY]: 'The code expires in {{minutes}} minutes.',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_HINT]: 'If you did not try to sign in, you can safely ignore this email.',
};
