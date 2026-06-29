/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbstractEntityService } from './service';

/**
 * Base class for junction/association entity services (role-permission, user-role,
 * client-scope, …) whose rows carry no top-level `realm_id`, only the realm of the
 * entities they link. The OWNER entity's realm gates a junction write — it is supplied to
 * the realm_scope reach factor under the `realmMatch` PolicyData key (RealmMatchPolicyEvaluator
 * SCOPE MODE), NOT stamped into ATTRIBUTES — so junction ATTRIBUTES carry only genuine
 * columns and an ATTRIBUTE_NAMES policy never mis-sees a synthetic `realm_id`.
 */
export abstract class JunctionEntityService extends AbstractEntityService {
    /**
     * Attribute carrying the OWNER entity's realm — the realm-bound entity whose
     * sub-resource this junction manages (e.g. `role_realm_id` for role-permission,
     * `user_realm_id` for user-role). `abstract` => every junction service MUST declare
     * it; a missing declaration is a compile error, which is what closes the fail-open
     * gap (a structural guard, not a convention).
     */
    protected abstract readonly ownerRealmKey: string;

    /**
     * The junction's genuine attributes for a permission `evaluate()` — a COPY of the row
     * (never the persisted entity). No synthetic `realm_id`; the owner realm travels
     * separately via {@link junctionResourceRealm}.
     */
    protected junctionAttributes(entity: Record<string, any>): Record<string, any> {
        return { ...entity };
    }

    /**
     * The OWNER realm for the realm_scope reach factor — set under the `realmMatch` PolicyData
     * key alongside ATTRIBUTES. A `null` owner (global) is matched (and `own` correctly denies
     * it). Reading `ownerRealmKey` keeps the compile-time guard: a junction cannot silently
     * skip its realm.
     */
    protected junctionResourceRealm(entity: Record<string, any>): string | null {
        return entity[this.ownerRealmKey] ?? null;
    }
}
