/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IMailTemplateRenderer,
    MailContent,
    MailRenderInput,
    MailTemplateName,
} from './types.ts';
import { resolveMailTemplateStrings } from './templates.ts';

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Wrap the per-template body in a small branded HTML shell. Inline styles
 * only — mail clients strip <style>/external CSS.
 */
function renderHtmlShell(intro: string, code: string, action?: { label: string, url: string }): string {
    const button = action ?
        `<p style="margin:24px 0;">
            <a href="${action.url}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#6d7fcc;color:#ffffff;text-decoration:none;font-weight:600;">${escapeHtml(action.label)}</a>
        </p>` :
        '';

    return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f4f4f6;font-family:Nunito,Segoe UI,Arial,sans-serif;color:#26272c;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
        <div style="font-family:Asap,Arial,sans-serif;font-weight:700;font-size:20px;color:#6d7fcc;margin-bottom:16px;">Authup</div>
        <p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9aa0aa;">Code</p>
        <p style="margin:0;font-family:monospace;font-size:16px;letter-spacing:0.04em;word-break:break-all;background:#f4f4f6;border-radius:8px;padding:12px 14px;">${escapeHtml(code)}</p>
        ${button}
    </div>
    <div style="max-width:480px;margin:12px auto 0;text-align:center;font-size:12px;color:#9aa0aa;">Made with &#128154;</div>
</body>
</html>`;
}

function renderText(intro: string, code: string, action?: { label: string, url: string }): string {
    const lines = [intro, '', `Code: ${code}`];
    if (action) {
        lines.push('', `${action.label}: ${action.url}`);
    }

    return lines.join('\n');
}

export class MailTemplateRenderer implements IMailTemplateRenderer {
    render<N extends MailTemplateName>(input: MailRenderInput<N>): MailContent {
        const strings = resolveMailTemplateStrings(input.template, input.locale);

        const action = input.params.url ?
            { label: strings.actionLabel, url: input.params.url } :
            undefined;

        return {
            subject: strings.subject,
            html: renderHtmlShell(strings.intro, input.params.code, action),
            text: renderText(strings.intro, input.params.code, action),
        };
    }
}
