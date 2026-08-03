/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import { REALM_WILDCARD_NAME } from '../constants.ts';
import type { RealmProvisioningEntity, RealmProvisioningRelations } from '../entities/index.ts';
import { mergeProvisioningEntity } from '../merge/index.ts';
import type { IProvisioningSynchronizer, IRealmProvisioner } from '../types.ts';
import type { WildcardRealmProvisionerContext } from './types.ts';

function canonicalizeRealmName(name: string): string {
    return name.trim().toLowerCase();
}

/**
 * Split the wildcard entries (attributes.name === '*') out of
 * `data.realms`, folding multiples (several files, several entries) into
 * one via the composite merge rules. The folded entry is stripped to a
 * relations-only shape: a wildcard entry is a SELECTOR over realms, so
 * realm-level attributes and a realm-level strategy carry no meaning
 * (validated away on the file path; discarded structurally here so
 * programmatic sources get the same semantics).
 */
export function extractWildcardRealmEntry(
    data: { realms?: RealmProvisioningEntity[] },
): RealmProvisioningEntity | undefined {
    if (!data.realms || data.realms.length === 0) {
        return undefined;
    }

    const wildcards = data.realms.filter(
        (entry) => entry.attributes.name === REALM_WILDCARD_NAME,
    );
    if (wildcards.length === 0) {
        return undefined;
    }

    data.realms = data.realms.filter(
        (entry) => entry.attributes.name !== REALM_WILDCARD_NAME,
    );

    let folded = wildcards[0];
    for (let i = 1; i < wildcards.length; i++) {
        folded = mergeProvisioningEntity(folded, wildcards[i]) as RealmProvisioningEntity;
    }

    return {
        attributes: { name: REALM_WILDCARD_NAME },
        relations: folded.relations ?? {},
    };
}

/**
 * Deep-merge the wildcard entry UNDER every explicit realm entry (explicit
 * wins per attribute, relation lists union, the explicit child's strategy
 * wins when it carries one) so the graph sync covers those realms in
 * one pass. Returns the merged relations per canonical realm name, kept
 * PRISTINE (cloned before the sync mutates anything) for the runtime
 * creation hook.
 */
export function expandWildcardRealmEntry(
    wildcard: RealmProvisioningEntity,
    data: { realms?: RealmProvisioningEntity[] },
): Map<string, RealmProvisioningRelations> {
    const variants = new Map<string, RealmProvisioningRelations>();

    if (data.realms) {
        data.realms = data.realms.map((entry) => {
            const merged = mergeProvisioningEntity(
                structuredClone(wildcard),
                entry,
            ) as RealmProvisioningEntity;

            if (entry.attributes.name) {
                variants.set(
                    canonicalizeRealmName(entry.attributes.name),
                    structuredClone(merged.relations ?? {}),
                );
            }

            return merged;
        });
    }

    return variants;
}

/**
 * Applies the wildcard entry's relations to ONE realm, by synthesizing a
 * realm provisioning entity and pushing it through the regular realm
 * synchronizer (scopes -> clients -> permissions -> roles -> users; the
 * realm row itself is resolved by name and, carrying no strategy, is
 * never modified). The entry is deep-cloned per application: the
 * synchronizer mutates its input (realmId stamping, `replace` writes the
 * resolved row id back), so a shared object would leak one realm's ids
 * into the next realm's sync.
 */
export class WildcardRealmProvisioner implements IRealmProvisioner {
    protected relations: RealmProvisioningRelations;

    protected relationsByRealmName?: Map<string, RealmProvisioningRelations>;

    protected synchronizer: IProvisioningSynchronizer<RealmProvisioningEntity>;

    protected logger?: Logger;

    constructor(ctx: WildcardRealmProvisionerContext) {
        this.relations = ctx.relations;
        this.relationsByRealmName = ctx.relationsByRealmName;
        this.synchronizer = ctx.synchronizer;
        this.logger = ctx.logger;
    }

    /**
     * True when the loaded config also declares this realm explicitly:
     * the startup graph sync already covers it (expansion), so the boot
     * backfill loop skips it.
     */
    hasExplicitEntry(realm: Realm): boolean {
        if (!this.relationsByRealmName || !realm.name) {
            return false;
        }
        return this.relationsByRealmName.has(canonicalizeRealmName(realm.name));
    }

    async ensureForRealm(realm: Realm): Promise<void> {
        if (!realm.name) {
            this.logger?.warn(
                `Skipping wildcard realm provisioning for realm ${realm.id}: the realm carries no name.`,
            );
            return;
        }

        const name = canonicalizeRealmName(realm.name);
        const relations = this.relationsByRealmName?.get(name) ?? this.relations;

        await this.synchronizer.synchronize(structuredClone({
            attributes: { name },
            relations,
        }));
    }
}
