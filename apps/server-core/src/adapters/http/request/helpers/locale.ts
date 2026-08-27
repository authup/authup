/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocaleCode } from '@authup/i18n';
import { matchLocale } from '@authup/i18n';
import { LOCALE_COOKIE } from '@authup/server-console-kit';
import { useRequestCookie } from '@routup/basic/cookie';
import type { IAppEvent } from 'routup';
import { getRequestAcceptableLanguages } from 'routup';

// The cookie name is owned by @authup/server-console-kit, which stamps the
// served shells from it. Re-exported so this module stays the one place
// server-core reads a request locale from.
export { LOCALE_COOKIE };

/**
 * Resolve the requester's preferred **authored** locale. The explicit UI
 * locale cookie (`vc-locale`, written by @vuecs/locale) wins when it maps
 * onto a supported catalog locale; `auto` and unsupported values fall
 * through to the Accept-Language chain (routup-negotiated, q-ordered),
 * which is walked for the first language authup ships — so
 * `pt-BR, de;q=0.8` resolves to `de`, not the default. Returns undefined
 * when nothing matches (callers fall back to the default locale).
 */
export function useRequestLocale(event: IAppEvent): LocaleCode | undefined {
    const cookie = useRequestCookie(event, LOCALE_COOKIE);
    if (typeof cookie === 'string') {
        const matched = matchLocale(cookie);
        if (matched) {
            return matched;
        }
    }

    const languages = getRequestAcceptableLanguages(event);
    for (const language of languages) {
        const matched = matchLocale(language);
        if (matched) {
            return matched;
        }
    }

    return undefined;
}
