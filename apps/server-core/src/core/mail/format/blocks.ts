/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    MailActionBlock,
    MailCodeBlock,
    MailNoteBlock,
    MailParagraphBlock,
} from './types.ts';

export function paragraph(text: string): MailParagraphBlock {
    return { type: 'paragraph', text };
}

export function code(label: string, value: string): MailCodeBlock {
    return {
        type: 'code', 
        label, 
        value, 
    };
}

export function action(label: string, url: string): MailActionBlock {
    return {
        type: 'action', 
        label, 
        url, 
    };
}

export function note(text: string): MailNoteBlock {
    return { type: 'note', text };
}

/**
 * Only http(s) URLs may become call-to-action links. Action URLs are built
 * from `publicUrl` config today, so this is defense in depth against a
 * future caller passing an attacker-influenced value (e.g. `javascript:`).
 */
export function isSafeActionURL(input: string): boolean {
    let parsed: URL;

    try {
        parsed = new URL(input);
    } catch {
        return false;
    }

    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}
