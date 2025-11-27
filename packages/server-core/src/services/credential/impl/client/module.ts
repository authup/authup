/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { compare, hash } from '@authup/server-kit';
import type { ICredentialService } from '../../types';
import type { ClientEntity } from '../../../../database/domains';

export class ClientCredentialsService implements ICredentialService<ClientEntity> {
    async verify(input: string, entity: ClientEntity): Promise<boolean> {
        if (entity.is_confidential) {
            return true;
        }

        if (!entity.secret) {
            return false;
        }

        if (entity.secret_hashed) {
            return compare(input, entity.secret);
        }

        return input === entity.secret;
    }

    async protect(input: string): Promise<string> {
        return hash(input);
    }
}
