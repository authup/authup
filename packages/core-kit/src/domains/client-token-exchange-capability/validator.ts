/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '@authup/kit';
import {
    CLIENT_TOKEN_EXCHANGE_AUDIENCE_MAX_LENGTH,
    CLIENT_TOKEN_EXCHANGE_CAPABILITY_ACTION_PATTERN,
    CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPE_PATTERN,
    CLIENT_TOKEN_EXCHANGE_CAPABILITY_VALUE_MAX_LENGTH,
    CLIENT_TOKEN_EXCHANGE_MAX_AGE,
    ClientTokenExchangeRealmScope,
} from './constants';
import type { ClientTokenExchangeCapability } from './entity';

function isValidEntry(entry: string) : boolean {
    const segments = entry.split(':');

    if (segments.length > 2) {
        return false;
    }

    const [type, action] = segments as [string, string?];

    return CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPE_PATTERN.test(type) &&
        (typeof action === 'undefined' || CLIENT_TOKEN_EXCHANGE_CAPABILITY_ACTION_PATTERN.test(action));
}

const valueSchema = z
    .string()
    .trim()
    .min(1)
    .max(CLIENT_TOKEN_EXCHANGE_CAPABILITY_VALUE_MAX_LENGTH)
    .check((ctx) => {
        const entries = ctx.value.split(/\s+/);

        for (const entry of entries) {
            if (!isValidEntry(entry)) {
                ctx.issues.push({
                    input: ctx.value,
                    code: 'custom',
                    message: `The capability '${entry}' is not valid.`,
                });
            }
        }

        if (new Set(entries).size !== entries.length) {
            ctx.issues.push({
                input: ctx.value,
                code: 'custom',
                message: 'The capabilities must not contain duplicates.',
            });
        }

        // `bucket bucket:read` reads as a limit to `read`, while the bare type
        // allows every action.
        const conflict = entries.find((entry) => entry.includes(':') && entries.includes(entry.split(':')[0] as string));

        if (conflict) {
            ctx.issues.push({
                input: ctx.value,
                code: 'custom',
                message: `The capability '${conflict}' is already covered by its bare type.`,
            });
        }
    })
    .transform((value) => value.split(/\s+/).join(' '));

export class ClientTokenExchangeCapabilityValidator extends Container<ClientTokenExchangeCapability> {
    protected override initialize() {
        super.initialize();

        // `realmId` is deliberately not mounted: it derives from the client,
        // and neither it nor `clientId` changes after the create.
        this.mount(
            'clientId',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        // Provisioning requires only what identifies a row: an `absent` or a
        // partial `merge` declares nothing else.
        const audience = createValidator(
            z
                .string()
                .trim()
                .min(1)
                .max(CLIENT_TOKEN_EXCHANGE_AUDIENCE_MAX_LENGTH)
                .regex(/^[^\s\p{C}]+$/u),
        );

        this.mount('audience', { group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING] }, audience);
        this.mount('audience', { group: ValidatorGroup.UPDATE, optional: true }, audience);

        this.mountRequiredOnCreate('value', createValidator(valueSchema));

        this.mountRequiredOnCreate(
            'maxAge',
            createValidator(z.number().int().min(1).max(CLIENT_TOKEN_EXCHANGE_MAX_AGE)),
        );

        this.mount(
            'realmScope',
            { optional: true },
            createValidator(z.enum(ClientTokenExchangeRealmScope)),
        );
    }

    protected mountRequiredOnCreate(
        key: keyof ClientTokenExchangeCapability,
        validator: ReturnType<typeof createValidator>,
    ) {
        this.mount(key, { group: ValidatorGroup.CREATE }, validator);
        this.mount(key, { group: [ValidatorGroup.UPDATE, ValidatorGroup.PROVISIONING], optional: true }, validator);
    }
}
