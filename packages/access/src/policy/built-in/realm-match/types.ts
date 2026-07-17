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
    decisionStrategy?: `${DecisionStrategy}`,

    /**
     * Specifies the name(s) of the realm-id/name attribute(s) used for matching.
     * Can be a single attribute name or an array of attribute names.
     */
    attributeName?: string | string[],

    /**
     * Only match if the attribute is strict equal to the name.
     */
    attributeNameStrict?: boolean,

    /**
     * Determines if resources with null realm-id/name value should match all identity realms.
     * If true, any identity realm can access resources with null realm-id/name values.
     */
    attributeNullMatchAll?: boolean,

    /**
     * Coarse, actor-relative realm reach (none/own/ownOrNull/any). When set, the evaluator
     * runs in SCOPE MODE: it matches the resource realm read from the REALM_MATCH data key
     * against the identity realm via `realmScopeMatches`, and ignores `attributeName` /
     * `attributeNullMatchAll`. With no REALM_MATCH key present it neutral-passes.
     */
    scope?: `${RealmScope}`
}
