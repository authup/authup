/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { compare, hash } from '@authup/server-kit';
import type { User } from '@authup/core-kit';
import type { ICredentialService } from '../../types.ts';

/**
 * A cost-10 bcrypt hash of a random value nobody knows. Compared against when
 * there is no password to check, so every verification costs the same.
 */
const DUMMY_PASSWORD_HASH = '$2b$10$4bvWCFXIdgvNE.s2wpCZI.b9po7yC8CiYL3GORJfOcEhs7O.OU.V2';

export class UserCredentialsService implements ICredentialService<User> {
    async verify(input: string, entity: User): Promise<boolean> {
        if (!entity.password) {
            await compare(input, DUMMY_PASSWORD_HASH);
            return false;
        }

        return compare(input, entity.password);
    }

    async protect(input: string): Promise<string> {
        return hash(input);
    }
}
