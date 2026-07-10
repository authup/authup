/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationNamespace } from '@authup/i18n';
import { injectIlingo, injectLocale } from '@ilingo/vue';
import { translateIssues } from '@ilingo/validup';
import { extractErrorContext } from '../error';

/**
 * Resolve a caught error to a localized, user-facing message.
 *
 * Capture the active translator at call site (run this in `setup()`, before
 * any `await`), then use the returned async resolver. Lookup order:
 *
 * 1. **Field-level validup `issues`** (a validation failure) — translated
 *    via `@ilingo/validup`'s `translateIssues` (the same machinery that
 *    renders inline form-field errors), so the toast is both localized and
 *    field-specific instead of a generic "bad request" line.
 * 2. **Top-level `code`** — resolved against the `authupError` namespace
 *    (e.g. `permission_denied`, `entity_conflict`).
 * 3. **Raw server message** — last resort for non-HTTP / uncoded errors.
 */
export function useErrorTranslator(): (error: unknown) => Promise<string> {
    const ilingo = injectIlingo();
    const locale = injectLocale();

    return async (error) => {
        const ctx = extractErrorContext(error);

        if (ctx.issues) {
            const translated = await translateIssues(ctx.issues, ilingo, { locale: locale.value });
            const joined = translated
                .map((entry) => entry.message)
                .filter(Boolean)
                .join('\n');
            if (joined) {
                return joined;
            }
        }

        if (ctx.code) {
            const message = await ilingo.get({
                namespace: TranslatorTranslationNamespace.ERROR,
                key: ctx.code,
                data: ctx.data,
                locale: locale.value,
            });
            if (message) {
                return message;
            }
        }

        return ctx.message ?? 'An unexpected error occurred.';
    };
}
