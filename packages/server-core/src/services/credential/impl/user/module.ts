/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { compare, hash } from '@authup/server-kit';
import type { ICredentialService } from '../../types';
import type { UserEntity } from '../../../../database/domains';

export class UserCredentialService implements ICredentialService<UserEntity> {
    async verify(input: string, entity: UserEntity): Promise<boolean> {
        if (!entity.password) {
            return false;
        }

        return compare(input, entity.password);
    }

    async protect(input: string): Promise<string> {
        return hash(input);
    }
}
