/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { compare, hash } from '@authup/server-kit';
import { createNanoID } from '@authup/kit';
import type { Robot } from '@authup/core-kit';
import type { ICredentialService } from '../../types.ts';

export class RobotCredentialsService implements ICredentialService<Robot> {
    async verify(input: string, entity: Robot): Promise<boolean> {
        if (!entity.secret) {
            return false;
        }

        return compare(input, entity.secret);
    }

    async protect(input: string): Promise<string> {
        return hash(input);
    }

    generateSecret() {
        return createNanoID(64);
    }
}
