/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// A JSON string is a valid YAML double-quoted scalar, which also defuses the Norway problem and a leading `*`.
export function quoteYaml(value: string): string {
    return JSON.stringify(value);
}

const PLAIN = /^[A-Za-z0-9_@:/.\-+=%?&,]*$/;

// Whether a value survives the .env round trip at all. dotenv strips the surrounding quotes and, inside DOUBLE quotes,
// turns a literal \n or \r into the control character itself, with no escape that survives (it never unescapes a
// doubled backslash). A value carrying a single quote, which rules the single-quoted form out, together with one of
// those two sequences therefore has no representation, and `askSecret` refuses it rather than corrupting a password.
export function isEnvRepresentable(value: string): boolean {
    return !value.includes('\'') || !/\\[nr]/.test(value);
}

// For the .env dotenv reads (`authup start` loads it from cwd): a value is single-quoted when it carries no single
// quote and written raw inside double quotes otherwise, which round-trips everything `isEnvRepresentable` admits.
export function quoteEnv(value: string): string {
    if (PLAIN.test(value)) {
        return value;
    }

    if (!value.includes('\'')) {
        return `'${value}'`;
    }

    return `"${value}"`;
}

// For the .env compose-go reads: double quotes take backslash escapes and `$` interpolates unless doubled, while a
// single-quoted `\'` there is an escaped quote rather than a literal, so one double-quoted branch covers every value.
export function quoteComposeEnv(value: string): string {
    if (PLAIN.test(value)) {
        return value;
    }

    return `"${escapeComposeInterpolation(value.replace(/[\\"]/g, '\\$&'))}"`;
}

// compose interpolates `$name` and `${name}` in every yaml value and .env value; `$$` is its literal dollar.
export function escapeComposeInterpolation(value: string): string {
    return value.replace(/\$/g, '$$$$');
}

export function indent(text: string, spaces: number): string {
    const prefix = ' '.repeat(spaces);

    return text
        .split('\n')
        .map((line) => (line.length > 0 ? prefix + line : line))
        .join('\n');
}
