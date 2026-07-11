/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { describe, expect, it } from 'vitest';
import { UserValidator, isUserNameValid } from '../../../src';

describe('src/domains/user', () => {
    it('should not be a valid user name ("bot" in name)', () => {
        expect(isUserNameValid('bot123')).toBeFalsy();
    });

    it('should not be a valid user name ("system" in name)', () => {
        expect(isUserNameValid('system')).toBeFalsy();
    });

    describe('UserValidator password', () => {
        it('should reject a password below the default minimum length', async () => {
            const validator = new UserValidator();

            await expect(validator.run({ password: 'a'.repeat(9) })).rejects.toThrow();
        });

        it('should accept a password at the default minimum length', async () => {
            const validator = new UserValidator();

            const output = await validator.run({ password: 'a'.repeat(10) });
            expect(output.password).toEqual('a'.repeat(10));
        });

        it('should honor a configured minimum length', async () => {
            const validator = new UserValidator({ passwordMinLength: 12 });

            await expect(validator.run({ password: 'a'.repeat(11) })).rejects.toThrow();

            const output = await validator.run({ password: 'a'.repeat(12) });
            expect(output.password).toEqual('a'.repeat(12));
        });

        it('should keep the maximum length at 512', async () => {
            const validator = new UserValidator();

            await expect(validator.run({ password: 'a'.repeat(513) })).rejects.toThrow();

            const output = await validator.run({ password: 'a'.repeat(512) });
            expect(output.password).toEqual('a'.repeat(512));
        });
    });
});
