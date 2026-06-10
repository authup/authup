/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Open-redirect guard for the `redirect` query parameter carried by the
 * auth workflow pages: only same-origin relative paths pass through, so the
 * value can be safely reflected into an anchor href / forwarded as a
 * post-login destination.
 *
 * Rejects: non-strings, control/whitespace chars (browsers strip some,
 * shifting where the URL authority begins), protocol-relative (`//host`),
 * backslash variants (browsers normalise `\` → `/`), and any scheme
 * (`javascript:`, `http:`) — both on the raw and once-decoded form so a
 * percent-encoded separator (`%2f`, `%5c`) can't slip past.
 */
export function sanitizeRelativeRedirect(input: unknown): string | undefined {
    if (typeof input !== 'string' || input.length === 0) {
        return undefined;
    }

    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0020\u007f]/.test(input)) {
        return undefined;
    }

    let decoded: string;
    try {
        decoded = decodeURIComponent(input);
    } catch {
        return undefined;
    }

    for (const candidate of [input, decoded]) {
        if (!candidate.startsWith('/')) {
            return undefined;
        }
        if (candidate.length > 1 && (candidate[1] === '/' || candidate[1] === '\\')) {
            return undefined;
        }
        if (candidate.includes('\\')) {
            return undefined;
        }
    }

    return input;
}
