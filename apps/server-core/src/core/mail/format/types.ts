/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Structural building blocks of a mail body. Templates compose blocks;
 * the html/text formatters turn the same block list into both mail parts,
 * so the two representations cannot drift apart.
 */
export type MailParagraphBlock = {
    type: 'paragraph',
    text: string,
};

export type MailCodeBlock = {
    type: 'code',
    label: string,
    value: string,
};

export type MailActionBlock = {
    type: 'action',
    label: string,
    url: string,
};

export type MailNoteBlock = {
    type: 'note',
    text: string,
};

export type MailBlock = MailParagraphBlock |
MailCodeBlock |
MailActionBlock |
MailNoteBlock;

export type MailDocument = {
    // BCP-47 language tag of the rendered copy (drives <html lang>).
    lang?: string,
    // Hidden preheader shown by mail clients next to the subject.
    preview?: string,
    blocks: MailBlock[],
};
