/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MailBlock, MailDocument } from './types.ts';

function renderBlock(block: MailBlock): string {
    switch (block.type) {
        case 'paragraph': {
            return block.text;
        }
        case 'code': {
            return `${block.label}: ${block.value}`;
        }
        case 'action': {
            return `${block.label}: ${block.url}`;
        }
        case 'note': {
            return block.text;
        }
        default: {
            return '';
        }
    }
}

export function renderTextDocument(document: MailDocument): string {
    return document.blocks
        .map((block) => renderBlock(block))
        .filter((line) => line.length > 0)
        .join('\n\n');
}
