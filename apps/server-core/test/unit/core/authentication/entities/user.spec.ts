/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isEntityCredentialsInvalidError } from '@authup/errors';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { UserAuthenticator } from '../../../../../src/core/authentication/entities/user/module.ts';
import { UserCredentialsService } from '../../../../../src/core/authentication/credential/entities/user/module.ts';
import { FakeIdentityResolver } from '../../helpers/fake-identity-resolver.ts';

describe('core/authentication/entities/user', () => {
    it('runs the credential check for an unknown user before refusing', async () => {
        const resolver = new FakeIdentityResolver();
        resolver.setIdentity(null);

        const verify = vi.spyOn(UserCredentialsService.prototype, 'verify');

        const authenticator = new UserAuthenticator(resolver);
        await expect(authenticator.authenticate('unknown', 'secret'))
            .rejects.toSatisfy((e) => isEntityCredentialsInvalidError(e));

        expect(verify).toHaveBeenCalledTimes(1);
        verify.mockRestore();
    });

    it('pays a bcrypt comparison for a user without a password', async () => {
        const service = new UserCredentialsService();

        const start = performance.now();
        await expect(service.verify('secret', {} as never)).resolves.toBe(false);

        // a cost-10 comparison takes tens of milliseconds; skipping it takes none
        expect(performance.now() - start).toBeGreaterThan(10);
    });
});
