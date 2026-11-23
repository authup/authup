/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbstractEntityService } from './service.ts';
import type { JunctionOwnerRealm, JunctionOwnerRealmResolved } from './types.ts';

/**
 * Base class for junction/association entity services (role-permission, user-role,
 * client-scope, ...) whose rows carry no top-level `realmId`, only the realm of the
 * entities they link. The OWNER entity's realm is the record realm of a junction check
 * (the `realm` of `evaluateRecord` and its siblings), never stamped into ATTRIBUTES, so
 * junction ATTRIBUTES carry only genuine columns and an ATTRIBUTE_NAMES policy never
 * mis-sees a synthetic `realmId`.
 */
export abstract class JunctionEntityService extends AbstractEntityService {
    /**
     * Where the OWNER entity's realm comes from: the realm-bound entity whose
     * sub-resource this junction manages. Either a column of the junction row
     * (`{ key: 'roleRealmId' }` for role-permission, `{ key: 'userRealmId' }`
     * for user-role), or, for an owner pinned to one realm that carries no
     * realm column, the realm itself (`{ realm: 'blog' }`) or a resolver per
     * row (`{ realm: (entity) => ... }`). `abstract` and exclusive: every
     * junction service must declare exactly one of the two, and a missing
     * declaration is a compile error, which is what closes the fail-open gap
     * (a structural guard, not a convention).
     */
    protected abstract readonly ownerRealm: JunctionOwnerRealm;

    /**
     * The junction's genuine attributes for a record check: a COPY of the row (never the
     * persisted entity). No synthetic `realmId`; the owner realm travels separately via
     * {@link junctionResourceRealm}.
     */
    protected junctionAttributes(entity: Record<string, any>): Record<string, any> {
        return { ...entity };
    }

    /**
     * The OWNER realm, handed to a record check as its `realm`. A `null` owner (global) is
     * matched (and `own` correctly denies it). A column is read raw: a row missing it
     * (a projection that stripped it) yields `undefined`, which the record check throws on
     * rather than reading as a global row.
     */
    protected junctionResourceRealm(entity: Record<string, any>): string | null {
        const owner = this.ownerRealm;

        if (typeof owner.key === 'string') {
            return entity[owner.key];
        }

        const { realm } = owner as JunctionOwnerRealmResolved;

        return typeof realm === 'function' ? realm(entity) : realm;
    }
}
