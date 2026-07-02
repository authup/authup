/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readStringField } from './credentials.ts';

/**
 * Read the realm hint (`realm_id` ?? `realm_name`) from the given request
 * sources (checked in order). Both fields denote the same realm key and each
 * accepts a realm UUID or name. Values are canonicalized at the ingress
 * (`trim().toLowerCase()`, canonical identifier form layer 3) since no
 * validator runs on the token body.
 */
export function readRealmHint(...sources: (Record<string, any> | undefined)[]): string | undefined {
    for (const source of sources) {
        const hint = [
            readStringField(source, 'realm_id'),
            readStringField(source, 'realm_name'),
        ]
            .map((value) => value?.trim().toLowerCase())
            .find((value) => !!value);

        if (hint) {
            return hint;
        }
    }

    return undefined;
}
