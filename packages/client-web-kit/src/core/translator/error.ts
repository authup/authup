/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { TranslatorTranslationNamespace } from '@authup/i18n';
import { injectIlingo, injectLocale } from '@ilingo/vue';
import { translateIssues } from '@ilingo/validup';
import type { Issue } from 'validup';

export type ErrorContext = {
    code?: string;
    data?: Record<string, any>;
    message?: string;
    issues?: Issue[];
    /**
     * The HTTP status of the transport error (a hapic `ClientError`'s
     * `response.status`), when the error arrived over HTTP. Absent for a
     * directly-thrown / non-HTTP error.
     */
    status?: number;
};

/**
 * Pull the structured `{ code, data, message, issues, status }` out of whatever
 * the caller caught. An authup server error arrives as a hapic `ClientError`
 * whose `response.data` is the serialized error body (`AuthupError.toJSON`
 * flattens `code` + `data` onto the top level and carries the validup
 * `issues`); a directly-thrown `AuthupError` or plain `Error` exposes the
 * same fields on itself. Duck-typed on purpose — no hapic import (it is not a
 * declared dependency, and its `isClientError` guard is `instanceof`-based, so
 * it would miss a non-hapic-instance error), works for both transports.
 */
export function extractErrorContext(error: unknown): ErrorContext {
    if (!isObject(error)) {
        return { message: typeof error === 'string' ? error : undefined };
    }

    const self = error as Record<string, any>;
    const { response } = self;
    const body: Record<string, any> = isObject(response) && isObject(response.data) ?
        response.data :
        self;

    const status = isObject(response) && typeof response.status === 'number' ?
        response.status :
        undefined;

    // The server-side body `message` is the most specific human string; the
    // transport error's own `message` (e.g. hapic's "Request failed") is only
    // the last resort.
    let message: string | undefined;
    if (typeof body.message === 'string') {
        message = body.message;
    } else if (typeof self.message === 'string') {
        message = self.message;
    }

    return {
        code: typeof body.code === 'string' ? body.code : undefined,
        data: body,
        message,
        // Only validation (`BAD_REQUEST`) errors carry issues; a coded
        // business error serializes an empty array.
        issues: Array.isArray(body.issues) && body.issues.length > 0 ? body.issues : undefined,
        status,
    };
}

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
