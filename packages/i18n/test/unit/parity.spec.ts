/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { Translations } from 'ilingo';
import { describe, expect, it } from 'vitest';
import {
    CATALOGS,
    DEFAULT_LOCALE,
    TranslatorTranslationClientKey,
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    TranslatorTranslationVuecsKey,
} from '../../src';

/**
 * Canonical key set per namespace — the single source of truth every
 * authored locale must match exactly (no missing keys, no extras).
 */
const EXPECTED_KEYS: Record<`${TranslatorTranslationNamespace}`, string[]> = {
    [TranslatorTranslationNamespace.DEFAULT]: Object.values(TranslatorTranslationDefaultKey),
    [TranslatorTranslationNamespace.CLIENT]: Object.values(TranslatorTranslationClientKey),
    [TranslatorTranslationNamespace.VUECS]: Object.values(TranslatorTranslationVuecsKey),
    [TranslatorTranslationNamespace.ERROR]: Object.values(ErrorCode),
};

/**
 * Reduce the shipped `CatalogNode` back to a `locale → namespace →
 * translations` lookup so the test asserts against the actual assembled
 * artifact (catching namespace mis-wiring), not the raw source records.
 * Mirrors the flat shape authup authors today (one translations group
 * per namespace, no sub-namespaces).
 */
function toRegistry(): Record<string, Record<string, Translations>> {
    const registry: Record<string, Record<string, Translations>> = {};

    for (const locale of CATALOGS.data) {
        const namespaces: Record<string, Translations> = {};
        for (const child of locale.data) {
            if (child.type !== 'namespace') {
                continue;
            }

            const data: Translations = {};
            for (const grandChild of child.data) {
                if (grandChild.type === 'translations') {
                    Object.assign(data, grandChild.data);
                }
            }
            namespaces[child.name] = data;
        }
        registry[locale.name] = namespaces;
    }

    return registry;
}

const registry = toRegistry();
const authoredLocales = Object.keys(registry);

describe('locale parity', () => {
    it('authors at least the default locale', () => {
        expect(authoredLocales).toContain('en');
    });

    it('authors the configured DEFAULT_LOCALE', () => {
        expect(authoredLocales).toContain(DEFAULT_LOCALE);
    });

    for (const locale of authoredLocales) {
        describe(`locale "${locale}"`, () => {
            for (const namespace of Object.values(TranslatorTranslationNamespace)) {
                const expectedKeys = EXPECTED_KEYS[namespace].slice().sort();
                const translations = registry[locale][namespace] ?? {};
                const actualKeys = Object.keys(translations).sort();

                it(`namespace "${namespace}" has exactly the expected keys`, () => {
                    expect(actualKeys).toEqual(expectedKeys);
                });

                it(`namespace "${namespace}" has non-empty values`, () => {
                    for (const key of expectedKeys) {
                        const value = translations[key];
                        // A value is either a plain string or an ilingo
                        // PluralNode (an object of count-bucket → string).
                        // Assert non-emptiness without assuming it is a string.
                        if (typeof value === 'string') {
                            expect(value.trim().length).toBeGreaterThan(0);
                        } else {
                            expect(value).toBeTypeOf('object');
                            expect(value).not.toBeNull();

                            const buckets = Object.values(value as Record<string, unknown>);
                            expect(buckets.length).toBeGreaterThan(0);
                            for (const bucket of buckets) {
                                expect(typeof bucket).toBe('string');
                                expect((bucket as string).trim().length).toBeGreaterThan(0);
                            }
                        }
                    }
                });
            }
        });
    }
});
