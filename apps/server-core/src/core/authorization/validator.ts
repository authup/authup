/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AUTHORIZATION_CHECK_GRANTED, RealmScope } from '@authup/access';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { AuthorizationCheckPayload } from './types.ts';

/**
 * How many names, and how many entries per selector list, one call may ask
 * about.
 *
 * The cost is one policy-tree walk per (definition, target realm) pair, and
 * the walk is synchronous, so on this route the ceiling is a latency budget
 * for the whole process rather than a politeness limit. The lists are the
 * half a CALLER controls: a name no selected definition carries costs no walk,
 * so a list of invented names is cheap, while every extra target realm
 * multiplies the walks over every selected definition, and every extra owner
 * realm or client widens the selection. Measured against a default
 * deployment's 73 definitions: 7 ms for the two target realms `ownOrNull`
 * resolves to, 9.6 ms at four, 19 ms at eight.
 *
 * Four is therefore the ceiling of each list: it covers the caller's own
 * realm, the global rows and two it names, which is more than any surface in
 * this repository asks for, and it holds the worst case a caller can buy at
 * roughly the cost of the call the route exists to serve.
 *
 * What neither bound covers is the size of the deployment's own permission
 * catalogue on the names-omitted path, which is operator-controlled rather
 * than caller-controlled (about 240 ms at 1000 global definitions). Capping
 * that would refuse the console it was built for; the answer there is the
 * definition read's own cache (#3599), not a ceiling here.
 */
export const AUTHORIZATION_CHECK_NAMES_MAX = 256;
export const AUTHORIZATION_CHECK_SELECTOR_MAX = 4;

/**
 * A target realm selector: symbolic, or a verbatim list of ids and/or `null`.
 * An id is never resolved, so an unknown one selects nothing.
 */
export const authorizationCheckTargetRealmsSchema = z.union([
    z.literal(RealmScope.OWN),
    z.literal(RealmScope.OWN_OR_NULL),
    z.array(z.string().min(1).nullable()).max(AUTHORIZATION_CHECK_SELECTOR_MAX),
]);

/**
 * An owner (realm or client) selector: a target realm selector, or `granted`,
 * which only an owner selector accepts, since a grant names the owner of a
 * definition and says nothing about where a resource lives.
 */
export const authorizationCheckSelectorSchema = z.union([
    authorizationCheckTargetRealmsSchema,
    z.literal(AUTHORIZATION_CHECK_GRANTED),
]);

/**
 * The body `POST /authorization/check` takes. Every member is optional, and
 * an empty body is the whole point: a caller that names nothing is asking
 * about every global definition, checked against its own realm and the
 * global rows, which is what a UI needs and what keeps it from maintaining a
 * list of its own.
 */
export class AuthorizationCheckValidator extends Container<AuthorizationCheckPayload> {
    override initialize() {
        super.initialize();

        this.mount('names', createValidator(
            z.array(z.string().min(1)).max(AUTHORIZATION_CHECK_NAMES_MAX).optional(),
        ));
        this.mount('realms', createValidator(authorizationCheckSelectorSchema.optional()));
        this.mount('clients', createValidator(authorizationCheckSelectorSchema.optional()));
        this.mount('targetRealms', createValidator(authorizationCheckTargetRealmsSchema.optional()));
    }
}
