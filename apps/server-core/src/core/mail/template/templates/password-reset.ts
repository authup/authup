/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationMailKey } from '@authup/i18n';
import { 
    action, 
    code, 
    note, 
    paragraph, 
} from '../../format/blocks.ts';
import { defineMailTemplate } from '../define.ts';
import { MailTemplateName } from '../types.ts';

export const passwordResetMailTemplate = defineMailTemplate({
    name: MailTemplateName.PASSWORD_RESET,
    build: async (params, t) => {
        const [subject, intro, codeLabel, actionLabel, hint] = await Promise.all([
            t(TranslatorTranslationMailKey.PASSWORD_RESET_SUBJECT),
            t(TranslatorTranslationMailKey.PASSWORD_RESET_INTRO),
            t(TranslatorTranslationMailKey.CODE),
            t(TranslatorTranslationMailKey.PASSWORD_RESET_ACTION),
            t(TranslatorTranslationMailKey.PASSWORD_RESET_HINT),
        ]);

        const expiry = params.expiresInMinutes ?
            await t(TranslatorTranslationMailKey.PASSWORD_RESET_EXPIRY, { minutes: params.expiresInMinutes }) :
            undefined;

        return {
            subject,
            preview: intro,
            blocks: [
                paragraph(intro),
                code(codeLabel, params.code),
                ...(params.url ? [action(actionLabel, params.url)] : []),
                ...(expiry ? [note(expiry)] : []),
                note(hint),
            ],
        };
    },
});
