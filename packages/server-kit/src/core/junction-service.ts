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
 * entities they link. Realm gating of a junction write therefore depends on stamping
 * the OWNER entity's realm as the canonical `realm_id` onto the `evaluate()` input —
 * without it the realm_scope factor neutral-passes and the write fails OPEN
 * (silent cross-realm leak).
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
     * Build the ATTRIBUTES for a permission `evaluate()` on a junction row, stamping the
     * owner realm as the canonical `realm_id` onto a COPY (never the persisted entity).
     * Use this instead of spreading `realm_id` by hand so a junction can never silently
     * skip the stamp.
     */
    protected junctionAttributes(entity: Record<string, any>): Record<string, any> {
        return { ...entity, realm_id: entity[this.ownerRealmKey] ?? null };
    }
}
