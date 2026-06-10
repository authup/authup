/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
// Mail templates
// ---------------------------------------------------------------------------

export enum MailTemplateName {
    REGISTRATION_ACTIVATION = 'registration-activation',
    PASSWORD_RESET = 'password-reset',
}

export type MailTemplateParamsMap = {
    [MailTemplateName.REGISTRATION_ACTIVATION]: { code: string, url?: string },
    [MailTemplateName.PASSWORD_RESET]: { code: string, url?: string },
};

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
 * services, which pass `{ template, params }` instead of building HTML.
 */
export interface IMailTemplateRenderer {
    render<N extends MailTemplateName>(input: MailRenderInput<N>): MailContent;
}
