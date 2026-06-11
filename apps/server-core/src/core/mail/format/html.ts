/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MailBlock, MailDocument } from './types.ts';

export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderBlock(block: MailBlock): string {
    switch (block.type) {
        case 'paragraph': {
            return `<p style="margin:0 0 16px;">${escapeHtml(block.text)}</p>`;
        }
        case 'code': {
            return `<p style="margin:0 0 4px;font-size:13px;color:#9aa0aa;">${escapeHtml(block.label)}</p>
        <p style="margin:0 0 16px;font-family:monospace;font-size:16px;letter-spacing:0.04em;word-break:break-all;background:#f4f4f6;border-radius:8px;padding:12px 14px;">${escapeHtml(block.value)}</p>`;
        }
        case 'action': {
            return `<p style="margin:24px 0 16px;">
            <a href="${escapeHtml(block.url)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#6d7fcc;color:#ffffff;text-decoration:none;font-weight:600;">${escapeHtml(block.label)}</a>
        </p>`;
        }
        case 'note': {
            return `<p style="margin:0 0 8px;font-size:13px;color:#9aa0aa;">${escapeHtml(block.text)}</p>`;
        }
        default: {
            return '';
        }
    }
}

/**
 * Wrap the block list in a small branded HTML shell. Inline styles only —
 * mail clients strip <style>/external CSS. The preheader is rendered
 * invisible but picked up by clients as the preview line.
 */
export function renderHtmlDocument(document: MailDocument): string {
    const preheader = document.preview ?
        `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(document.preview)}</div>` :
        '';

    return `<!doctype html>
<html lang="${escapeHtml(document.lang || 'en')}">
<body style="margin:0;padding:24px;background:#f4f4f6;font-family:Nunito,Segoe UI,Arial,sans-serif;color:#26272c;">
    ${preheader}
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
        <div style="font-family:Asap,Arial,sans-serif;font-weight:700;font-size:20px;color:#6d7fcc;margin-bottom:16px;">Authup</div>
        ${document.blocks.map((block) => renderBlock(block)).join('\n        ')}
    </div>
    <div style="max-width:480px;margin:12px auto 0;text-align:center;font-size:12px;color:#9aa0aa;">Made with &#128154;</div>
</body>
</html>`;
}
