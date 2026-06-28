/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '@authup/kit';
import type { RealmScope } from '../../../permission/realm-scope';
import type { BasePolicy } from '../../types';

export interface RealmMatchPolicy extends BasePolicy {
    /**
     * Determines how realm-id/name matches are handled.
     */
    decision_strategy?: `${DecisionStrategy}`,

    /**
     * Specifies the name(s) of the realm-id/name attribute(s) used for matching.
     * Can be a single attribute name or an array of attribute names.
     */
    attribute_name?: string | string[],

    /**
     * Only match if the attribute is strict equal to the name.
     */
    attribute_name_strict?: boolean,

    /**
     * Determines if resources with null realm-id/name value should match all identity realms.
     * If true, any identity realm can access resources with null realm-id/name values.
     */
    attribute_null_match_all?: boolean,

    /**
     * Coarse, actor-relative realm reach (none/own/ownOrNull/any). When set, the evaluator
     * runs in SCOPE MODE: it matches the resource realm (read from the REALM_MATCH data key,
     * falling back to ATTRIBUTES.realm_id) against the identity realm via `realmScopeMatches`,
     * and ignores `attribute_name` / `attribute_null_match_all`.
     */
    scope?: `${RealmScope}`
}
