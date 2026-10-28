/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup } from '@authup/kit';
import { describe, expect, it } from 'vitest';
import { PermissionValidator, isNameValid, isPermissionNameValid } from '../../../../src';

describe('domains/permission/validator', () => {
    it.each(['run:read', 'run:cancel', 'state:read', 'agent:worker-1:run', 'agent:worker_1:approve', 'user_read', 'user.read'])('accepts %s as a permission name', (name) => {
        expect(isPermissionNameValid(name)).toBe(true);
        expect(isPermissionNameValid(name, { throwOnFailure: true })).toBe(true);
    });

    it.each(['', 'Run:read', 'run: read', 'run:read\n', 'run/read', 'run:*', 'agent:<agent>:run'])('rejects %j as a permission name', (name) => {
        expect(isPermissionNameValid(name)).toBe(false);
        expect(() => isPermissionNameValid(name, { throwOnFailure: true })).toThrow();
    });

    it.each([ValidatorGroup.CREATE, ValidatorGroup.UPDATE, ValidatorGroup.PROVISIONING])('accepts and canonicalizes colon-separated names in group %s', async (group) => {
        const output = await new PermissionValidator().run({ name: ' Agent:Worker-1:Run ' }, { group });
        expect(output.name).toBe('agent:worker-1:run');
    });

    it('keeps colons invalid for other entity names', () => {
        expect(isNameValid('run:read')).toBe(false);
        expect(() => isNameValid('run:read', { throwOnFailure: true })).toThrow();
    });
});
