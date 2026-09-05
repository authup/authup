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

// For the .env dotenv reads (`authup start` loads it from cwd): dotenv strips the surrounding quotes and unescapes
// nothing but \n and \r inside double quotes, so a value is single-quoted when it carries no single quote and written
// raw inside double quotes otherwise. askSecret refuses a value carrying both quote kinds, which no dotenv quoting holds.
export function quoteEnv(value: string): string {
    if (PLAIN.test(value)) {
        return value;
    }

    if (!value.includes('\'')) {
        return `'${value}'`;
    }

    // ponytail: dotenv expands a literal \n or \r inside double quotes; a secret spelling those two escapes is the residual.
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
