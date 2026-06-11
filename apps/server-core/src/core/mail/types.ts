/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MailTemplateName, MailTemplateParamsMap } from './template/types.ts';

export type MailAddress = {
    name: string
    address: string
};

export type MailSendOptions = {
    to?: string | MailAddress,
    from?: string | MailAddress,
    subject?: string,
    text?: string,
    html?: string,
};

export interface IMailClient {
    send(options: MailSendOptions): Promise<void>;
}

// ---------------------------------------------------------------------------
// Mail rendering
// ---------------------------------------------------------------------------

export type MailRenderInput<N extends MailTemplateName = MailTemplateName> = {
    template: N,
    params: MailTemplateParamsMap[N],
    // BCP-47 / catalog code of the recipient. Falls back to the renderer's
    // default locale when absent or unsupported.
    locale?: string,
};

export type MailContent = {
    subject: string,
    html: string,
    text: string,
};

/**
 * Renders a localized, branded mail (subject + html + text) from a template
 * name and typed params. Decouples mail copy/markup from the workflow
 * services, which pass `{ template, params, locale }` instead of building
 * HTML. Async because copy resolution runs through ilingo's store contract
 * (memory today; file- or remote-backed overrides tomorrow).
 */
export interface IMailTemplateRenderer {
    render<N extends MailTemplateName>(input: MailRenderInput<N>): Promise<MailContent>;
}
