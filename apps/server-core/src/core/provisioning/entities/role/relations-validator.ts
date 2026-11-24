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
import type { RoleProvisioningRelations } from './types.ts';

export class RoleProvisioningRelationsValidator extends Container<RoleProvisioningRelations> {
    protected initialize() {
        super.initialize();

        this.mount('realmPermissions', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        // A client relation names clients of the role's realm, which a
        // global role does not have.
        this.mount('clientPermissions', { optional: true }, createValidator(
            this.isGlobal() ?
                z.never({ error: 'A global role cannot be bound to permissions a client owns.' }) :
                z.record(z.string(), z.array(z.string())),
        ));

        this.mount('globalPermissions', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('globalPermissionsExclude', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('globalPermissionsRealmScope', { optional: true }, createValidator(
            z.enum(RealmScope),
        ));

        this.mount('globalPermissionsPolicy', { optional: true }, createValidator(
            z.string(),
        ));

        this.mount('globalPermissionsRealmScopeOverrides', { optional: true }, createValidator(
            z.partialRecord(z.enum(RealmScope), z.array(z.string())),
        ));
    }

    protected isGlobal(): boolean {
        return false;
    }
}
