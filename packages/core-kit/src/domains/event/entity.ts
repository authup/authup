/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityType } from '../identity';
import type { Realm } from '../realm';
import type { EventName, EventScope } from './constants';

export interface Event {
    id: string;

    /**
     * Event group, e.g. oauth2, identity.
     */
    scope: `${EventScope}`;

    /**
     * Event action, e.g. login, loginFailed, authorize.
     */
    name: `${EventName}`;

    /**
     * Kind of the affected resource, e.g. session, user, client.
     */
    ref_type: string | null;

    /**
     * Identifier of the affected resource.
     */
    ref_id: string | null;

    /**
     * The OAuth2 client involved, if any.
     */
    client_id: string | null;

    // ------------------------------------------------------------------

    actor_type: `${IdentityType}` | null;

    actor_id: string | null;

    /**
     * Denormalized actor display snapshot — survives actor deletion.
     * On loginFailed it carries the canonicalized submitted identifier
     * (the throttle key) while actor_id stays null.
     */
    actor_name: string | null;

    // ------------------------------------------------------------------

    request_path: string | null;

    request_method: string | null;

    request_ip_address: string | null;

    request_user_agent: string | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    /**
     * PII-stripped context dict (allowlisted keys only).
     */
    data: Record<string, any> | null;

    // ------------------------------------------------------------------

    /**
     * default: false — rows with a stamped expires_at are expiring and get
     * swept.
     */
    expiring: boolean;

    /**
     * Expiration date (iso) — stamped at write from the retention config;
     * null = keep forever. Drives the retention sweep.
     */
    expires_at: string | null;

    /**
     * Creation date (iso).
     */
    created_at: string;
}
