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

export type EntityNamed = {
    name?: string | null,
    displayName?: string | null,
    builtIn?: boolean | null,
};

/**
 * How an entity names itself in a list or picker: the operator-set
 * `displayName` first, then the `@authup/i18n` catalog name in the active
 * locale, then the raw `name`. The catalog is consulted for a BUILT-IN
 * permission, policy or scope only, so an operator row that happens to be
 * named like a built-in identifier keeps its own name. A store refusing the
 * sync read falls through to the raw name as well.
 * Runs in `setup()`; the returned function reads the locale on each call, so
 * a render using it follows a locale switch.
 */
export function useEntityNameTranslator() : (type: string, entity: EntityNamed) => string {
    const ilingo = injectIlingo();
    const locale = injectLocale();

    return (type, entity) => {
        const name = entity.name || '';
        const displayName = (entity.displayName || '').trim();
        if (displayName.length > 0) {
            return displayName;
        }

        const namespace = ENTITY_NAME_NAMESPACES[type];
        if (!name || !namespace || !entity.builtIn) {
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
