/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { parse } from 'dotenv';
import {
    escapeComposeInterpolation,
    indent,
    isEnvRepresentable,
    quoteComposeEnv,
    quoteEnv,
    quoteYaml,
} from '../../src/utils.ts';

describe('quoteEnv', () => {
    it('should leave a plain value unquoted', () => {
        expect(quoteEnv('postgres://user:pass@db:5432/authup')).toEqual('postgres://user:pass@db:5432/authup');
        expect(quoteEnv('')).toEqual('');
    });

    it('should single-quote a value carrying no single quote', () => {
        expect(quoteEnv('pa$$ word#1')).toEqual('\'pa$$ word#1\'');
        expect(quoteEnv('say "hi"')).toEqual('\'say "hi"\'');
    });

    it('should double-quote a value carrying a single quote raw, since dotenv unescapes nothing', () => {
        expect(quoteEnv('it\'s \\ y')).toEqual('"it\'s \\ y"');
    });

    // The oracle for the encoder is the parser itself: dotenv is what `authup start` reads the emitted .env with.
    it('should round-trip through the real dotenv parser', () => {
        const values = [
            'plain',
            'pa ss #word',
            'say "hi"',
            'it\'s secret',
            'it\'s "both"',
            'p\\nass',
            'trailing\\',
            '$dollar ${braced}',
            'a\'b"c\\d',
        ];

        for (const value of values) {
            expect(isEnvRepresentable(value), value).toBe(true);
            expect(parse(`K=${quoteEnv(value)}`).K, value).toEqual(value);
        }
    });

    it('should refuse what it cannot encode, rather than corrupting it', () => {
        // dotenv turns \\n and \\r inside double quotes into the control character, and a single quote rules the
        // single-quoted form out, so these two shapes have no representation at all.
        expect(isEnvRepresentable('it\'s p\\nass')).toBe(false);
        expect(isEnvRepresentable('it\'s p\\rass')).toBe(false);
        expect(parse(`K=${quoteEnv('it\'s p\\nass')}`).K).not.toEqual('it\'s p\\nass');
    });
});

describe('quoteComposeEnv', () => {
    it('should leave a plain value unquoted', () => {
        expect(quoteComposeEnv('redis://redis:6379')).toEqual('redis://redis:6379');
    });

    it('should double-quote everything else, escaping backslash, double quote and dollar', () => {
        expect(quoteComposeEnv('abc\\')).toEqual('"abc\\\\"');
        expect(quoteComposeEnv('it\'s $ecret')).toEqual('"it\'s $$ecret"');
        expect(quoteComposeEnv('say "hi"')).toEqual('"say \\"hi\\""');
        expect(quoteComposeEnv('pa ss #word')).toEqual('"pa ss #word"');
    });
});

describe('escapeComposeInterpolation', () => {
    it('should double every dollar', () => {
        expect(escapeComposeInterpolation('svc$user ${HOME}')).toEqual('svc$$user $${HOME}');
    });
});

describe('quoteYaml', () => {
    it('should quote values yaml would otherwise reinterpret', () => {
        expect(quoteYaml('no')).toEqual('"no"');
        expect(quoteYaml('*.example.com')).toEqual('"*.example.com"');
    });
});

describe('indent', () => {
    it('should prefix every non-empty line', () => {
        expect(indent('a\n\nb', 2)).toEqual('  a\n\n  b');
    });
});
