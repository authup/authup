/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

const HTML_LIKE_TAG = /<\/?[A-Za-z][\w.-]*>/;

/**
 * release-please reads the merged release PR body with an html parser, so a
 * `<word>` in a changelog line (the subject or a footer such as BREAKING
 * CHANGE) is an unclosed element that swallows the following packages' notes
 * into one release. Backticks do not protect it.
 */
function noHtmlLikeTag(parsed) {
    const parts = [
        parsed.subject,
        parsed.footer,
        ...(parsed.notes || []).map((note) => note.text),
    ];

    const match = parts
        .filter((part) => typeof part === 'string')
        .map((part) => part.match(HTML_LIKE_TAG))
        .find(Boolean);

    return [
        !match,
        `the subject and footers must not contain ${match ? match[0] : 'a <word> placeholder'}: release-please parses it as html. Write it without angle brackets.`,
    ];
}

export default {
    extends: ['@tada5hi/commitlint-config'],
    plugins: [
        { rules: { 'no-html-like-tag': noHtmlLikeTag } },
    ],
    rules: { 'no-html-like-tag': [2, 'always'] },
};
