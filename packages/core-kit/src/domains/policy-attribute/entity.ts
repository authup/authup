/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '../policy';

export interface PolicyAttribute {
    id: string;

    name: string;

    value: string | null;

    // ------------------------------------------------------------------

    policy_id: Policy['id'];

    policy: Policy;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;
}
