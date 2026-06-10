/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { matchLocale } from '@authup/i18n';
import { injectLocale } from '@ilingo/vue';
import { useLocaleManager } from '@vuecs/locale';
import type { App, ComputedRef } from 'vue';
import { computed, watch } from 'vue';

function tryUseLocaleManager() {
    // useLocaleManager() throws when @vuecs/locale is not installed. Authup's
    // apps install it (so vuecs owns the locale, cookie-backed — same as
    // color-mode owns vc-color-mode), but a downstream consumer that embeds
    // the kit without it should still get a working switcher.
    try {
        return useLocaleManager();
    } catch {
        return undefined;
    }
}

export type LocaleControl = {
    /** Active locale narrowed to a supported catalog code. */
    code: ComputedRef<string>,
    /** Apply a locale; persistence is owned by vuecs when present. */
    set: (input: string) => void,
};

/**
 * Single control surface for the active UI locale. Prefers `@vuecs/locale`'s
 * manager (the source of truth — cookie persistence, `auto`/browser
 * resolution, `<html lang>` sync, `Config['locale']`), and falls back to the
 * ilingo locale ref when vuecs-locale is absent.
 */
export function useLocaleControl(): LocaleControl {
    const manager = tryUseLocaleManager();
    const ilingo = injectLocale();

    const code = computed<string>(() => {
        const source = manager ? manager.resolved.value : ilingo.value;
        return matchLocale(source) ?? ilingo.value;
    });

    return {
        code,
        set: (input) => {
            if (manager) {
                manager.set(input);
            } else {
                ilingo.value = input;
            }
        },
    };
}

/**
 * One-way bridge that keeps the ilingo locale (driving authup's catalogs) in
 * sync with vuecs's resolved locale (the source of truth). No-op when
 * vuecs-locale is not installed — there ilingo is the source directly.
 */
export function syncTranslatorLocaleFromManager(app: App): void {
    const manager = app.runWithContext(() => tryUseLocaleManager());
    if (!manager) {
        return;
    }

    const ilingo = app.runWithContext(() => injectLocale());
    watch(
        manager.resolved,
        (value) => {
            const mapped = matchLocale(value);
            if (mapped && mapped !== ilingo.value) {
                ilingo.value = mapped;
            }
        },
        { immediate: true },
    );
}
