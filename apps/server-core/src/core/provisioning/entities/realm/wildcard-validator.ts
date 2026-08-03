/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_RESERVED_NAMES } from '@authup/core-kit';
import { createValidator } from '@validup/zod';
import type { ContainerInput, ContainerRunOptions, Issue } from 'validup';
import { Container, ValidupError, defineIssueItem } from 'validup';
import { z } from 'zod';
import { REALM_WILDCARD_NAME } from '../../constants.ts';
import { RealmProvisioningRelationsValidator } from './relations-validator.ts';
import type { RealmProvisioningEntity } from './types.ts';

/**
 * Validates a WILDCARD realm entry (attributes.name === '*'). A wildcard
 * entry is a selector over realms, not a realm declaration, so it is
 * relations-only: `attributes` may carry nothing but the literal wildcard
 * name, and a realm-level `strategy` is rejected (`absent` would mean
 * "delete every realm"). Child strategies stay fully supported.
 *
 * Reserved client names (system / console clients) are rejected: a
 * template stamping one into every realm would fight the system client
 * MERGE on every boot.
 */
export class RealmWildcardProvisioningValidator extends Container<RealmProvisioningEntity> {
    protected initialize() {
        super.initialize();

        this.mount('attributes', createValidator(
            z.looseObject({ name: z.literal(REALM_WILDCARD_NAME) }).check((ctx) => {
                const keys = Object.keys(ctx.value);
                if (keys.length > 1) {
                    ctx.issues.push({
                        code: 'custom',
                        input: ctx.value,
                        message: 'A wildcard realm entry is relations-only and can not declare realm attributes.',
                    });
                }
            }),
        ));

        this.mount('strategy', { optional: true }, createValidator(
            z.any().check((ctx) => {
                ctx.issues.push({
                    code: 'custom',
                    input: ctx.value,
                    message: 'A wildcard realm entry can not declare a realm-level strategy.',
                });
            }),
        ));

        const relationsValidator = new RealmProvisioningRelationsValidator();
        this.mount('relations', { optional: true }, relationsValidator);
    }

    override async run(
        input?: ContainerInput<RealmProvisioningEntity>,
        options?: ContainerRunOptions<RealmProvisioningEntity>,
    ): Promise<RealmProvisioningEntity> {
        const output = await super.run(input, options);

        const issues : Issue[] = [];
        const clients = output.relations?.clients ?? [];
        clients.forEach((client, index) => {
            const name = client.attributes?.name;
            if (name && (CLIENT_RESERVED_NAMES as string[]).includes(name)) {
                issues.push(defineIssueItem({
                    path: ['relations', 'clients', index, 'attributes', 'name'],
                    message: `The client name "${name}" is reserved for system clients and can not be declared in a wildcard realm entry.`,
                    received: name,
                }));
            }
        });

        if (issues.length > 0) {
            throw new ValidupError(issues);
        }

        return output;
    }
}
