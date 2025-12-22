/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';

export interface ISessionRepository {
    findOneById(id: string): Promise<Session | null> | null;

    save(session: Partial<Session>): Promise<Session>;
}
