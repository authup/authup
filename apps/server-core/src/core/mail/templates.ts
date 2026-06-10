/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MailTemplateName } from './types.ts';

/**
 * Per-template, per-locale mail copy. Kept local to the mail module (rather
 * than in the UI-focused `@authup/i18n`) because mail is a server-rendered
 * concern with no frontend coupling. `intro` precedes the verification code;
 * `actionLabel` is the call-to-action link text.
 */
export type MailTemplateStrings = {
    subject: string,
    intro: string,
    actionLabel: string,
};

export const MAIL_DEFAULT_LOCALE = 'en';

export const MAIL_TEMPLATES: Record<
    MailTemplateName,
    Record<string, MailTemplateStrings>
> = {
    [MailTemplateName.REGISTRATION_ACTIVATION]: {
        en: {
            subject: 'Activate your account',
            intro: 'Use the code below to activate your account and start using the platform.',
            actionLabel: 'Activate account',
        },
        de: {
            subject: 'Konto aktivieren',
            intro: 'Verwende den folgenden Code, um dein Konto zu aktivieren und die Plattform zu nutzen.',
            actionLabel: 'Konto aktivieren',
        },
        fr: {
            subject: 'Activez votre compte',
            intro: 'Utilisez le code ci-dessous pour activer votre compte et commencer à utiliser la plateforme.',
            actionLabel: 'Activer le compte',
        },
        es: {
            subject: 'Activa tu cuenta',
            intro: 'Usa el código de abajo para activar tu cuenta y empezar a usar la plataforma.',
            actionLabel: 'Activar cuenta',
        },
    },
    [MailTemplateName.PASSWORD_RESET]: {
        en: {
            subject: 'Reset your password',
            intro: 'Use the code below to reset your account password.',
            actionLabel: 'Reset password',
        },
        de: {
            subject: 'Passwort zurücksetzen',
            intro: 'Verwende den folgenden Code, um dein Kontopasswort zurückzusetzen.',
            actionLabel: 'Passwort zurücksetzen',
        },
        fr: {
            subject: 'Réinitialisez votre mot de passe',
            intro: 'Utilisez le code ci-dessous pour réinitialiser le mot de passe de votre compte.',
            actionLabel: 'Réinitialiser le mot de passe',
        },
        es: {
            subject: 'Restablece tu contraseña',
            intro: 'Usa el código de abajo para restablecer la contraseña de tu cuenta.',
            actionLabel: 'Restablecer contraseña',
        },
    },
};

/**
 * Resolve template strings for a locale, narrowing BCP-47 (`de-DE` → `de`)
 * and falling back to the default locale when unsupported.
 */
export function resolveMailTemplateStrings(
    template: MailTemplateName,
    locale?: string,
): MailTemplateStrings {
    const catalog = MAIL_TEMPLATES[template];
    const short = locale ? locale.toLowerCase().split('-')[0] : undefined;

    return (short && catalog[short]) || catalog[MAIL_DEFAULT_LOCALE];
}
