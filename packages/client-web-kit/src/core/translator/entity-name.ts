/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import { TranslatorTranslationNamespace } from '@authup/i18n';
import { injectIlingo, injectLocale } from '@ilingo/vue';

const ENTITY_NAME_NAMESPACES : Partial<Record<string, TranslatorTranslationNamespace>> = {
    [EntityType.PERMISSION]: TranslatorTranslationNamespace.PERMISSION,
    [EntityType.POLICY]: TranslatorTranslationNamespace.POLICY,
    [EntityType.SCOPE]: TranslatorTranslationNamespace.SCOPE,
};

/**
 * The display name of a built-in permission, policy or scope in the active
 * locale, and the raw identifier for every other name (an operator-created
 * row, an entity type without a catalog, a store that refuses the sync read).
 * Runs in `setup()`; the returned function reads the locale on each call, so
 * a render using it follows a locale switch.
 */
export function useEntityNameTranslator() : (type: string, name: string) => string {
    const ilingo = injectIlingo();
    const locale = injectLocale();

    return (type, name) => {
        const namespace = ENTITY_NAME_NAMESPACES[type];
        if (!namespace) {
            return name;
        }

        try {
            // ilingo walks a dotted key as a path, so `system.default` has to
            // be escaped to reach the flat catalog entry of that name.
            return ilingo.getSync({
                locale: locale.value,
                namespace,
                key: name.replace(/\./g, '\\.'),
            }) ?? name;
        } catch {
            return name;
        }
    };
}
