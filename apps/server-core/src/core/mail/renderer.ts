/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { InternalError } from '@authup/errors';
import {
    CATALOGS,
    DEFAULT_LOCALE,
    TranslatorTranslationNamespace,
    matchLocale,
} from '@authup/i18n';
import { Ilingo, MemoryStore } from 'ilingo';
import { isSafeActionURL } from './format/blocks.ts';
import { renderHtmlDocument } from './format/html.ts';
import { renderTextDocument } from './format/text.ts';
import type { MailDocument } from './format/types.ts';
import { MAIL_TEMPLATE_REGISTRY } from './template/registry.ts';
import type { MailTemplateName } from './template/types.ts';
import type {
    IMailTemplateRenderer,
    MailContent,
    MailRenderInput,
} from './types.ts';

export class MailTemplateRenderer implements IMailTemplateRenderer {
    protected ilingo : Ilingo;

    constructor() {
        this.ilingo = new Ilingo({
            store: new MemoryStore({ data: CATALOGS }),
            locale: DEFAULT_LOCALE,
        });
    }

    async render<N extends MailTemplateName>(input: MailRenderInput<N>): Promise<MailContent> {
        const template = MAIL_TEMPLATE_REGISTRY[input.template];

        // Narrow the requested BCP-47 tag onto an authored catalog locale
        // up front, so the copy and the rendered `<html lang>` agree.
        const locale = matchLocale(input.locale) ?? DEFAULT_LOCALE;

        const output = await template.build(
            input.params,
            (key, data) => this.translate(locale, key, data),
        );

        const document : MailDocument = {
            lang: locale,
            preview: output.preview,
            // Central guard: a call-to-action never renders with a non-http(s)
            // URL, regardless of what an individual template composed.
            blocks: output.blocks.filter(
                (block) => block.type !== 'action' || isSafeActionURL(block.url),
            ),
        };

        return {
            subject: output.subject,
            html: renderHtmlDocument(document),
            text: renderTextDocument(document),
        };
    }

    protected async translate(
        locale: string,
        key: string,
        data?: Record<string, any>,
    ): Promise<string> {
        const value = await this.ilingo.get({
            namespace: TranslatorTranslationNamespace.MAIL,
            key,
            locale,
            data,
        });

        if (typeof value === 'undefined') {
            throw new InternalError(`The mail translation "${key}" (locale: ${locale}) could not be resolved.`);
        }

        return value;
    }
}
