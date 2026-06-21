/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { TranslatorTranslationNamespace } from '@authup/i18n';
import { useTranslator } from './singleton.ts';

export type ErrorContext = {
    code?: string;
    data?: Record<string, any>;
    message?: string;
};

/**
 * Pull the structured `{ code, data, message }` out of whatever the caller
 * caught. An authup server error arrives as a hapic `ClientError` whose
 * `response.data` is the serialized error body (`AuthupError.toJSON`
 * flattens `code` + `data` onto the top level); a directly-thrown
 * `AuthupError` or plain `Error` exposes the same fields on itself.
 * Duck-typed on purpose — no hapic import, works for both transports.
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
    };
}

/**
 * Resolve a caught error to a localized, user-facing message.
 *
 * Capture the active translator at call site (run this in `setup()`), then
 * use the returned async resolver: it maps the error's `code` against the
 * `authupError` namespace (passing the serialized body as `data`, so any
 * `{{param}}` placeholder resolves), and falls back to the raw server
 * message when the code is unknown or absent.
 */
export function useErrorTranslator(): (error: unknown) => Promise<string> {
    const translate = useTranslator();

    return async (error) => {
        const ctx = extractErrorContext(error);

        if (ctx.code) {
            const translated = await translate({
                namespace: TranslatorTranslationNamespace.ERROR,
                key: ctx.code,
                data: ctx.data,
            });

            // `useTranslator` returns the bare key on a miss — treat that as
            // "no catalog entry" and fall through to the raw message.
            if (translated && translated !== ctx.code) {
                return translated;
            }
        }

        return ctx.message ?? 'An unexpected error occurred.';
    };
}
