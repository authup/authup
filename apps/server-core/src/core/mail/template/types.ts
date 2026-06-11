/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TranslatorTranslationMailKey } from '@authup/i18n';
import type { MailBlock } from '../format/types.ts';

export enum MailTemplateName {
    REGISTRATION_ACTIVATION = 'registration-activation',
    PASSWORD_RESET = 'password-reset',
}

export type MailTemplateParamsMap = {
    [MailTemplateName.REGISTRATION_ACTIVATION]: {
        code: string,
        url?: string,
    },
    [MailTemplateName.PASSWORD_RESET]: {
        code: string,
        url?: string,
        expiresInMinutes?: number,
    },
};

/**
 * Locale-bound translator handed to a template's `build`. Resolves a key
 * of the `authupMail` namespace (`@authup/i18n`) through ilingo — `data`
 * feeds `{{var}}` interpolation. Async so file- or remote-backed override
 * stores can slot in behind the same contract.
 */
export type MailTemplateTranslator = (
    key: `${TranslatorTranslationMailKey}`,
    data?: Record<string, any>,
) => Promise<string>;

export type MailTemplateBuildOutput = {
    subject: string,
    // Hidden preheader shown by mail clients as the preview line.
    preview?: string,
    blocks: MailBlock[],
};

/**
 * A mail template composes its body from blocks; subject, html and text
 * all derive from the same build output. Copy is not embedded — it is
 * resolved per locale through the supplied translator.
 */
export type MailTemplate<N extends MailTemplateName = MailTemplateName> = {
    name: N,
    build(
        params: MailTemplateParamsMap[N],
        t: MailTemplateTranslator,
    ): Promise<MailTemplateBuildOutput>,
};
