/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '../../../constants';
import type { PolicyBase } from '../../types';
import type { BuiltInPolicyType } from '../constants';

export interface RealmMatchPolicy extends PolicyBase {
    type: `${BuiltInPolicyType.REALM_MATCH}`,

    /**
     * Determines how realm-id/name matches are handled.
     */
    decisionStrategy?: `${DecisionStrategy}`,

    /**
     * Specifies the name(s) of the realm-id/name attribute(s) used for matching.
     * Can be a single attribute name or an array of attribute names.
     */
    attributeName?: string | string[],

    /**
     * Determines if resources with null realm-id/name value should match all identity realms.
     * If true, any identity realm can access resources with null realm-id/name values.
     */
    attributeNullMatchAll?: boolean,

    /**
     * Specifies whether the master realm of an identity should match all realm-id/name attributes, including null.
     * If true, the master realm can access any resource regardless of its realm value.
     */
    identityMasterMatchAll?: boolean
}

export type RealmMatchPolicyOptions = Omit<RealmMatchPolicy, 'type'>;
