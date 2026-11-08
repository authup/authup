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
    CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPES_MAX_LENGTH,
    CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPE_PATTERN,
    CLIENT_TOKEN_EXCHANGE_MAX_LIFETIME,
    ClientTokenExchangeSubjectRealmScope,
} from './constants';
import type { ClientTokenExchangePolicy } from './entity';

const capabilityTypesSchema = z
    .string()
    .trim()
    .min(1)
    .max(CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPES_MAX_LENGTH)
    .check((ctx) => {
        const types = ctx.value.split(/\s+/);

        for (const type of types) {
            if (!CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPE_PATTERN.test(type)) {
                ctx.issues.push({
                    input: ctx.value,
                    code: 'custom',
                    message: `The capability type '${type}' is not valid.`,
                });
            }
        }

        if (new Set(types).size !== types.length) {
            ctx.issues.push({
                input: ctx.value,
                code: 'custom',
                message: 'The capability types must not contain duplicates.',
            });
        }
    })
    .transform((value) => value.split(/\s+/).join(' '));

export class ClientTokenExchangePolicyValidator extends Container<ClientTokenExchangePolicy> {
    protected override initialize() {
        super.initialize();

        // `realmId` is deliberately not mounted: it derives from the client,
        // and neither it nor `clientId` changes after the create.
        this.mount(
            'clientId',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        this.mountRequiredOnCreate(
            'audience',
            createValidator(
                z
                    .string()
                    .trim()
                    .min(1)
                    .max(CLIENT_TOKEN_EXCHANGE_AUDIENCE_MAX_LENGTH)
                    .regex(/^[^\s\p{C}]+$/u),
            ),
        );

        this.mountRequiredOnCreate('capabilityTypes', createValidator(capabilityTypesSchema));

        this.mountRequiredOnCreate(
            'maxLifetime',
            createValidator(z.number().int().min(1).max(CLIENT_TOKEN_EXCHANGE_MAX_LIFETIME)),
        );

        this.mount(
            'subjectRealmScope',
            { optional: true },
            createValidator(z.enum(ClientTokenExchangeSubjectRealmScope)),
        );
    }

    protected mountRequiredOnCreate(
        key: keyof ClientTokenExchangePolicy,
        validator: ReturnType<typeof createValidator>,
    ) {
        this.mount(key, { group: ValidatorGroup.CREATE }, validator);
        this.mount(key, { group: ValidatorGroup.UPDATE, optional: true }, validator);
    }
}
