/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationMailKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationMailGerman : NamespaceTranslations<`${TranslatorTranslationMailKey}`> = {
    [TranslatorTranslationMailKey.CODE]: 'Code',

    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_SUBJECT]: 'Konto aktivieren',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_INTRO]: 'Verwende den folgenden Code, um dein Konto zu aktivieren und die Plattform zu nutzen.',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_ACTION]: 'Konto aktivieren',
    [TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_HINT]: 'Wenn du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.',

    [TranslatorTranslationMailKey.PASSWORD_RESET_SUBJECT]: 'Passwort zurücksetzen',
    [TranslatorTranslationMailKey.PASSWORD_RESET_INTRO]: 'Verwende den folgenden Code, um dein Kontopasswort zurückzusetzen.',
    [TranslatorTranslationMailKey.PASSWORD_RESET_ACTION]: 'Passwort zurücksetzen',
    [TranslatorTranslationMailKey.PASSWORD_RESET_EXPIRY]: 'Der Code läuft in {{minutes}} Minuten ab.',
    [TranslatorTranslationMailKey.PASSWORD_RESET_HINT]: 'Wenn du keine Zurücksetzung angefordert hast, kannst du diese E-Mail ignorieren – dein Passwort bleibt unverändert.',

    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_SUBJECT]: 'Dein Bestätigungscode',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_INTRO]: 'Verwende den folgenden Code, um deine Anmeldung abzuschließen.',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_EXPIRY]: 'Der Code läuft in {{minutes}} Minuten ab.',
    [TranslatorTranslationMailKey.MFA_EMAIL_OTP_HINT]: 'Wenn du dich nicht anmelden wolltest, kannst du diese E-Mail ignorieren.',
};
