/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationMailKey } from '@authup/i18n';
import { code, note, paragraph } from '../../format/blocks.ts';
import { defineMailTemplate } from '../define.ts';
import { MailTemplateName } from '../types.ts';

export const mfaEmailOtpMailTemplate = defineMailTemplate({
    name: MailTemplateName.MFA_EMAIL_OTP,
    build: async (params, t) => {
        const [subject, intro, codeLabel, hint] = await Promise.all([
            t(TranslatorTranslationMailKey.MFA_EMAIL_OTP_SUBJECT),
            t(TranslatorTranslationMailKey.MFA_EMAIL_OTP_INTRO),
            t(TranslatorTranslationMailKey.CODE),
            t(TranslatorTranslationMailKey.MFA_EMAIL_OTP_HINT),
        ]);

        const expiry = params.expiresInMinutes ?
            await t(TranslatorTranslationMailKey.MFA_EMAIL_OTP_EXPIRY, { minutes: params.expiresInMinutes }) :
            undefined;

        return {
            subject,
            preview: intro,
            blocks: [
                paragraph(intro),
                code(codeLabel, params.code),
                ...(expiry ? [note(expiry)] : []),
                note(hint),
            ],
        };
    },
});
