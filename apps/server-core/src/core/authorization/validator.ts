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
 * The route is authenticated but carries no permission gate, and it costs one
 * policy-tree walk per pair, so the product is what needs a ceiling rather
 * than either half. A default deployment provisions 73 permissions and a
 * console asks about two realms, so both bounds sit far above every real call
 * and only refuse a caller that is not asking a question.
 */
export const AUTHORIZATION_CHECK_NAMES_MAX = 256;
export const AUTHORIZATION_CHECK_REALMS_MAX = 8;

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
