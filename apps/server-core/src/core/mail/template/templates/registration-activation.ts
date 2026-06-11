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

export const registrationActivationMailTemplate = defineMailTemplate({
    name: MailTemplateName.REGISTRATION_ACTIVATION,
    build: async (params, t) => {
        const [subject, intro, codeLabel, actionLabel, hint] = await Promise.all([
            t(TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_SUBJECT),
            t(TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_INTRO),
            t(TranslatorTranslationMailKey.CODE),
            t(TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_ACTION),
            t(TranslatorTranslationMailKey.REGISTRATION_ACTIVATION_HINT),
        ]);

        return {
            subject,
            preview: intro,
            blocks: [
                paragraph(intro),
                code(codeLabel, params.code),
                ...(params.url ? [action(actionLabel, params.url)] : []),
                note(hint),
            ],
        };
    },
});
