/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { compare, hash } from '@authup/server-kit';
import { createNanoID } from '@authup/kit';
import type { ICredentialService } from '../../types';
import type { RobotEntity } from '../../../../database/domains';

export class RobotCredentialsService implements ICredentialService<RobotEntity> {
    async verify(input: string, entity: RobotEntity): Promise<boolean> {
        if (!entity.secret) {
            return false;
        }

        return compare(input, entity.secret);
    }

    async protect(input: string): Promise<string> {
        return hash(input);
    }

    generateRawSecret() {
        return createNanoID(64);
    }
}
