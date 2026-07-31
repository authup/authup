/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Composable, FieldState } from '@validup/vue';
import {
    useTranslation as _useTranslation,
    injectIlingo,
    injectLocale,
} from '@ilingo/vue';
import {
    useTranslationsForComposable as _useTranslationsForComposable,
    useTranslationsForField as _useTranslationsForField,
} from '@ilingo/validup-vue';
import type { FieldTranslations } from '@ilingo/validup-vue';
import type { DataMaybeRef, GetContextReactive } from '@ilingo/vue';
import type { GetContext } from 'ilingo';
import type { ObjectLiteral } from 'validup';
import type { Ref } from 'vue';
import { computed, ref, unref } from 'vue';
import { injectHydrationStore, useHydratedValue } from '../hydration';

export function injectTranslatorLocale(): Ref<string> {
    return injectLocale();
}

function unwrapTranslationData(input: DataMaybeRef) : Record<string, string | number> {
    const output : Record<string, string | number> = {};
    const entries = Object.entries(input);
    for (const [key, value] of entries) {
        output[key] = unref(value);
    }

    return output;
}

function buildTranslationHydrationKey(ctx: GetContext) : string {
    return `authup:translation:${ctx.locale}:${ctx.namespace}:${ctx.key}:${ctx.count ?? ''}:${ctx.data ? JSON.stringify(ctx.data) : ''}`;
}

/**
 * Reactive translation lookup.
 *
 * `@ilingo/vue` resolves through ilingo's async `get()`, seeding the ref
 * with what the synchronous `getSync()` can answer (tada5hi/ilingo#988).
 * Authup's catalogs are a `MemoryStore`, so that seed IS the translation and
 * both the server-rendered markup and the render the client hydrates it
 * against hold the real string.
 *
 * A store that needs I/O (a cold `FSStore`/`LoaderStore`, a remote adapter a
 * consumer registers ahead of the kit's own) declines the synchronous read,
 * and the seed stays the `<namespace>.<key>` placeholder until the async
 * lookup settles a microtask later. That is a mismatch for every translated
 * string in a server-rendered subtree, so for those the server records what
 * it resolved and the hydrating client shows it until its own lookup
 * settles. Nothing is recorded when the seed already answered, which is
 * every authup key.
 */
export function useTranslation(input: GetContextReactive): Ref<string> {
    const source = _useTranslation(input);

    const store = injectHydrationStore();
    if (!store) {
        return source;
    }

    // `@ilingo/vue` falls back to this for both the seed and a missing key
    const placeholder = `${input.namespace}.${input.key}`;
    if (source.value !== placeholder) {
        return source;
    }

    const ilingo = injectIlingo();
    const locale = injectLocale();
    const recorded = ref<string>();

    const context = () : GetContext => ({
        locale: input.locale ? input.locale : locale.value,
        namespace: input.namespace,
        key: input.key,
        count: unref(input.count),
        data: input.data ? unwrapTranslationData(input.data) : undefined,
    });

    useHydratedValue<string>({
        key: buildTranslationHydrationKey(context()),
        resolve: () => ilingo.get(context()),
        apply: (value) => {
            recorded.value = value;
        },
    });

    return computed(() => {
        if (source.value === placeholder && recorded.value) {
            return recorded.value;
        }

        return source.value;
    });
}

/**
 * Imperative counterpart to {@see useTranslation} for non-reactive,
 * event-time lookups — toast bodies built when a mutation resolves, or
 * nav-label resolution inside the async `Navigation.reduce()` pipeline,
 * where a render-time `Ref` is the wrong shape. Captures the injected
 * ilingo instance + locale `Ref` at call site (so it must run in
 * `setup()`), then returns a translate function that reads the current
 * `locale.value` on each invocation. Missing keys resolve to the bare
 * key value rather than `undefined`.
 */
export function useTranslator(): (ctx: GetContext) => Promise<string> {
    const ilingo = injectIlingo();
    const locale = injectLocale();

    return async (ctx) => (await ilingo.get({ ...ctx, locale: locale.value })) ?? ctx.key;
}

/**
 * Translate the visible errors of a `@validup/vue` `FieldState` to
 * localized messages. Successor to the previous
 * `useTranslationsForBaseValidation` — reads `fieldState.$errors`
 * (already dirty-gated by `@validup/vue`), so the returned
 * `Ref<IssueTranslation[]>` only carries entries the user should see.
 */
export function useTranslationsForField<V = unknown>(
    fieldState: FieldState<V>,
): FieldTranslations {
    return _useTranslationsForField(fieldState);
}

/**
 * Translate the form-level `$errors` of a `@validup/vue` `Composable<T>`.
 * Successor to the previous `useTranslationsForNestedValidation` — sugar
 * for the common "render all dirty-gated field errors" pattern.
 */
export function useTranslationsForComposable<T extends ObjectLiteral = ObjectLiteral>(
    composable: Composable<T>,
): FieldTranslations {
    return _useTranslationsForComposable(composable);
}
