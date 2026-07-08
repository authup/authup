/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { OAuth2EndSessionRequest } from './types.ts';

// A blank param (e.g. a stray `?state=` from an RP template) is absent,
// not a validation failure — it must not discard the rest of the request.
const blankAsAbsent = (schema: z.ZodType) => z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema,
);

export class OAuth2EndSessionRequestValidator extends Container<OAuth2EndSessionRequest> {
    protected initialize() {
        super.initialize();

        this.mount(
            'id_token_hint',
            { optional: true },
            createValidator(blankAsAbsent(z.string().max(4096).nullable().optional())),
        );

        this.mount(
            'client_id',
            { optional: true },
            createValidator(blankAsAbsent(z.string().max(256).nullable().optional())),
        );

        this.mount(
            'post_logout_redirect_uri',
            { optional: true },
            createValidator(blankAsAbsent(z.string().url().max(2000).nullable().optional())),
        );

        this.mount(
            'state',
            { optional: true },
            createValidator(blankAsAbsent(z.string().max(2048).nullable().optional())),
        );

        // Canonical identifier form (layer 3): no other validator runs on the
        // end-session request, so the realm hint is canonicalized at this
        // ingress — same contract as the token endpoint's readRealmHint.
        this.mount(
            'realm_id',
            { optional: true },
            createValidator(blankAsAbsent(z.string().trim().toLowerCase().max(256).nullable().optional())),
        );

        this.mount(
            'realm_name',
            { optional: true },
            createValidator(blankAsAbsent(z.string().trim().toLowerCase().max(256).nullable().optional())),
        );
    }
}
