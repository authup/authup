/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GetContextReactive } from '@ilingo/vue';
import type { Ref } from 'vue';
import { reactive } from 'vue';
import { useTranslation } from './singleton';

/**
 * One entry of a {@see useTranslations} batch. Carries a full ilingo
 * lookup context: `namespace` + `key`, plus optional `count` for plural
 * selection (`count: 1` → singular, any other → plural) and `data` for
 * interpolation. The output map is keyed by `key`, so a single batch must
 * not list the same `key` twice.
 */
export type TranslationsInput = GetContextReactive;

type TranslationsInputNamespaced = Omit<TranslationsInput, 'namespace'>;

type OutputKey<T extends TranslationsInput> = T['key'] extends string ?
    T['key'] :
    string;

/**
 * Resolve a batch of translations spanning any number of namespaces.
 * Each element supplies its own `namespace`; the result is a reactive
 * keyed map of unwrapped strings — access as `map.key` (no `.value`) in
 * script, interpolation, and attribute bindings alike. The output key is
 * the element's `key`.
 */
export function useTranslations<const T extends readonly TranslationsInput[]>(
    elements: T,
): Record<OutputKey<T[number]>, string> {
    const output = {} as Record<string, Ref<string>>;
    for (const element of elements) {
        output[element.key] = useTranslation(element);
    }

    return reactive(output) as unknown as Record<OutputKey<T[number]>, string>;
}

/**
 * Single-namespace sugar over {@see useTranslations}: applies one shared
 * `namespace` to every element. Retained for batches that live entirely
 * in one namespace (e.g. the `authupApp` chrome labels).
 */
export function useTranslationsForNamespace<const T extends readonly TranslationsInputNamespaced[]>(
    namespace: string,
    elements: T,
): Record<OutputKey<T[number] & { namespace: string }>, string> {
    return useTranslations(
        elements.map((element) => ({ ...element, namespace })),
    ) as Record<OutputKey<T[number] & { namespace: string }>, string>;
}
