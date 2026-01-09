/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import { compare, hash } from '@authup/server-kit';
import type { Client } from '@authup/core-kit';
import type { ICredentialService } from '../../types.ts';

export class ClientCredentialsService implements ICredentialService<Client> {
    async verify(input: string, entity: Client): Promise<boolean> {
        if (!entity.secret) {
            return false;
        }

        if (entity.secret_hashed) {
            return compare(input, entity.secret);
        }

        // todo: secret encrypted missing (decrypt)

        return input === entity.secret;
    }

    async protect(input: string, entity: Client): Promise<string> {
        if (entity.secret_hashed) {
            return hash(input);
        }

        // todo: secret encrypted missing (encrypt)

        return input;
    }

    generateSecret() {
        return createNanoID(64);
    }
}
