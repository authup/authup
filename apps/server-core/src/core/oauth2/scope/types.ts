/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';

export interface IOAuth2ScopeRepository {
    findByClientId(clientId: string) : Promise<Scope[]>;
}
