/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup } from '@authup/kit';
import { describe, expect, it } from 'vitest';
import {
    ClientValidator,
    PolicyValidator,
    RealmValidator,
    UserValidator,
} from '../../../src';

describe('domains/validator-groups', () => {
    it('should run zero group-scoped mounts at a group-less run', async () => {
        const validator = new RealmValidator();

        const output = await validator.run({ name: 'MyRealm' } as any);

        expect(output).not.toHaveProperty('name');
    });

    it('should require and canonicalize name at CREATE and PROVISIONING', async () => {
        const validator = new RealmValidator();

        await expect(validator.run({} as any, { group: ValidatorGroup.CREATE })).rejects.toThrow();
        await expect(validator.run({} as any, { group: ValidatorGroup.PROVISIONING })).rejects.toThrow();

        const created = await validator.run({ name: ' FOO ' } as any, { group: ValidatorGroup.CREATE });
        expect(created.name).toEqual('foo');

        const provisioned = await validator.run({ name: ' FOO ' } as any, { group: ValidatorGroup.PROVISIONING });
        expect(provisioned.name).toEqual('foo');
    });

    it('should keep name optional at UPDATE', async () => {
        const validator = new RealmValidator();

        const output = await validator.run({ display_name: 'Foo Bar' } as any, { group: ValidatorGroup.UPDATE });

        expect(output.display_name).toEqual('Foo Bar');
    });

    it('should strip built_in at CREATE/UPDATE but accept it at PROVISIONING', async () => {
        const validator = new ClientValidator();

        const created = await validator.run(
            { name: 'foo', built_in: true } as any,
            { group: ValidatorGroup.CREATE },
        );
        expect(created).not.toHaveProperty('built_in');

        const updated = await validator.run(
            { built_in: true } as any,
            { group: ValidatorGroup.UPDATE },
        );
        expect(updated).not.toHaveProperty('built_in');

        const provisioned = await validator.run(
            { name: 'foo', built_in: true } as any,
            { group: ValidatorGroup.PROVISIONING },
        );
        expect(provisioned.built_in).toBe(true);
    });

    it('should require email at CREATE but not at PROVISIONING', async () => {
        const validator = new UserValidator();

        await expect(validator.run({ name: 'foo' } as any, { group: ValidatorGroup.CREATE })).rejects.toThrow();

        const provisioned = await validator.run({ name: 'foo' } as any, { group: ValidatorGroup.PROVISIONING });
        expect(provisioned.name).toEqual('foo');
        expect(provisioned).not.toHaveProperty('email');

        await expect(validator.run(
            { name: 'foo', email: 'not-an-email' } as any,
            { group: ValidatorGroup.PROVISIONING },
        )).rejects.toThrow();

        const withEmail = await validator.run(
            { name: 'foo', email: 'Foo@Example.com' } as any,
            { group: ValidatorGroup.PROVISIONING },
        );
        expect(withEmail.email).toEqual('foo@example.com');
    });

    it('should require the policy type at CREATE and PROVISIONING', async () => {
        const validator = new PolicyValidator();

        await expect(validator.run({ name: 'foo' } as any, { group: ValidatorGroup.CREATE })).rejects.toThrow();
        await expect(validator.run({ name: 'foo' } as any, { group: ValidatorGroup.PROVISIONING })).rejects.toThrow();

        const provisioned = await validator.run(
            {
                name: 'foo', 
                type: 'composite', 
                built_in: true, 
            } as any,
            { group: ValidatorGroup.PROVISIONING },
        );
        expect(provisioned.type).toEqual('composite');
        expect(provisioned.built_in).toBe(true);
    });
});
