/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyBase } from '../../types';
import type { BuiltInPolicyType } from '../constants';

export interface RealmMatchPolicy extends PolicyBase {
    type: `${BuiltInPolicyType.REALM_MATCH}`,

    /**
     * Resource realm_id attribute(s)
     */
    attributeName?: string | string[],

    /**
     * The master realm is permitted for resources of arbitrary realms.
     */
    masterMatchAll?: boolean
}

export type RealmMatchPolicyOptions = Omit<RealmMatchPolicy, 'type'>;
