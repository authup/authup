/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SystemPolicyName } from '@authup/access';
import { EntityType, PermissionName, ScopeName } from '@authup/core-kit';
import { TranslatorTranslationNamespace } from '@authup/i18n';
import { injectIlingo, injectLocale } from '@ilingo/vue';

const ENTITY_NAME_NAMESPACES : Partial<Record<string, TranslatorTranslationNamespace>> = {
    [EntityType.PERMISSION]: TranslatorTranslationNamespace.PERMISSION,
    [EntityType.POLICY]: TranslatorTranslationNamespace.POLICY,
    [EntityType.SCOPE]: TranslatorTranslationNamespace.SCOPE,
};

const ENTITY_NAME_KEYS : Partial<Record<string, readonly string[]>> = {
    [EntityType.PERMISSION]: Object.values(PermissionName),
    [EntityType.POLICY]: Object.values(SystemPolicyName),
    [EntityType.SCOPE]: Object.values(ScopeName),
};

// ponytail: bounded so a one-letter search cannot put the whole catalog in the URL.
const ENTITY_NAME_SEARCH_LIMIT = 100;

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
function readCatalogName(
    ilingo: ReturnType<typeof injectIlingo>,
    locale: string,
    namespace: string,
    name: string,
) : string | undefined {
    try {
        // ilingo walks a dotted key as a path, so `system.default` has to
        // be escaped to reach the flat catalog entry of that name.
        return ilingo.getSync({
            locale,
            namespace,
            key: name.replace(/\./g, '\\.'),
        }) ?? undefined;
    } catch {
        return undefined;
    }
}

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

        return readCatalogName(ilingo, locale.value, namespace, name) ?? name;
    };
}

/**
 * The built-in identifiers of an entity type whose catalog name in the
 * active locale contains `text` (case-insensitive), so a search can match
 * the label a list shows. Empty for a type without a catalog, and when the
 * store refuses the sync read.
 */
export function useEntityNameSearch() : (type: string, text: string) => string[] {
    const ilingo = injectIlingo();
    const locale = injectLocale();

    return (type, text) => {
        const namespace = ENTITY_NAME_NAMESPACES[type];
        const keys = ENTITY_NAME_KEYS[type];
        const needle = text.trim().toLowerCase();
        if (!namespace || !keys || needle.length === 0) {
            return [];
        }

        const output : string[] = [];
        for (const key of keys) {
            const label = readCatalogName(ilingo, locale.value, namespace, key);
            if (label && label.toLowerCase().includes(needle)) {
                output.push(key);
                if (output.length >= ENTITY_NAME_SEARCH_LIMIT) {
                    break;
                }
            }
        }

        return output;
    };
}
