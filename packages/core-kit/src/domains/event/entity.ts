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
    refType: string | null;

    /**
     * Identifier of the affected resource.
     */
    refId: string | null;

    /**
     * The OAuth2 client involved, if any.
     */
    clientId: string | null;

    // ------------------------------------------------------------------

    actorType: `${IdentityType}` | null;

    actorId: string | null;

    /**
     * Denormalized actor display snapshot — survives actor deletion.
     * On loginFailed it carries the canonicalized submitted identifier
     * (the throttle key) while actorId stays null.
     */
    actorName: string | null;

    // ------------------------------------------------------------------

    requestPath: string | null;

    requestMethod: string | null;

    requestIpAddress: string | null;

    requestUserAgent: string | null;

    // ------------------------------------------------------------------

    realmId: Realm['id'] | null;

    /**
     * PII-stripped context dict (allowlisted keys only).
     */
    data: Record<string, any> | null;

    // ------------------------------------------------------------------

    /**
     * default: false — rows with a stamped expiresAt are expiring and get
     * swept.
     */
    expiring: boolean;

    /**
     * Expiration date (iso) — stamped at write from the retention config;
     * null = keep forever. Drives the retention sweep.
     */
    expiresAt: string | null;

    /**
     * Creation date (iso).
     */
    createdAt: string;
}
