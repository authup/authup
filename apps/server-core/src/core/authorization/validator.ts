/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmScope } from '@authup/access';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { AuthorizationCheckPayload } from './types.ts';

/**
 * How many names and realms one call may ask about.
 *
 * The cost is one policy-tree walk per (name, realm) pair, and the walk is
 * synchronous, so on this route the ceiling is a latency budget for the whole
 * process rather than a politeness limit. The realm count is the half a CALLER
 * controls: a name the memory provider cannot resolve is refused before any
 * walk, so a list of invented names is cheap, while every extra realm
 * multiplies the walks over every definition the deployment holds. Measured
 * against a default deployment's 73 definitions: 7 ms for the two realms
 * `ownOrNull` resolves to, 9.6 ms at four, 19 ms at eight.
 *
 * Four is therefore the realm ceiling: it covers the caller's own realm, the
 * global rows and two it names, which is more than any surface in this
 * repository asks for, and it holds the worst case a caller can buy at roughly
 * the cost of the call the route exists to serve.
 *
 * What neither bound covers is the size of the deployment's own permission
 * catalogue on the names-omitted path, which is operator-controlled rather
 * than caller-controlled (about 240 ms at 1000 global definitions). Capping
 * that would refuse the console it was built for; the answer there is the
 * definition read's own cache (#3599), not a ceiling here.
 */
export const AUTHORIZATION_CHECK_NAMES_MAX = 256;
export const AUTHORIZATION_CHECK_REALMS_MAX = 4;

export const authorizationCheckRealmsSchema = z.union([
    z.literal(RealmScope.OWN),
    z.literal(RealmScope.OWN_OR_NULL),
    z.array(z.string().min(1).nullable()).max(AUTHORIZATION_CHECK_REALMS_MAX),
]);

/**
 * The body `POST /authorization/check` takes. Both members are optional, and
 * an empty body is the whole point: a caller that names nothing is asking
 * about every definition in its own realm and the global rows, which is what
 * a UI needs and what keeps it from maintaining a list of its own.
 */
export class AuthorizationCheckValidator extends Container<AuthorizationCheckPayload> {
    override initialize() {
        super.initialize();

        this.mount('names', createValidator(
            z.array(z.string().min(1)).max(AUTHORIZATION_CHECK_NAMES_MAX).optional(),
        ));
        this.mount('realms', createValidator(authorizationCheckRealmsSchema.optional()));
    }
}
