/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { isPermissionPolicyBinding } from '../helpers';
import type { PermissionPolicyBinding } from '../types';
import type { AuthorizationSnapshot } from './types';

/**
 * One binding of a snapshot, checked shallowly: its policy trees are
 * re-projected by the evaluator, under the caller's validator registry.
 */
export const authorizationSnapshotBindingSchema = z.custom<PermissionPolicyBinding>(
    (value) => isPermissionPolicyBinding(value),
    { message: 'The entry is not a permission policy binding.' },
);

/**
 * A snapshot as it is stored: one binding per definition, and optionally one
 * per grant. A container of its own, so a consumer can mount it into the
 * validator of whatever document holds the snapshot.
 */
export class AuthorizationSnapshotValidator extends Container<AuthorizationSnapshot> {
    override initialize() {
        super.initialize();

        this.mount('definitions', createValidator(z.array(authorizationSnapshotBindingSchema)));
        this.mount('grants', { optional: true }, createValidator(z.array(authorizationSnapshotBindingSchema)));
    }
}
