/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, DecisionStrategy, SystemPolicyName } from '@authup/access';
import type { PolicyProvisioningEntity } from '../../../core/provisioning/entities/policy/index.ts';

export function buildSystemPolicyProvisioningEntities(): PolicyProvisioningEntity {
    return {
        attributes: {
            name: SystemPolicyName.DEFAULT,
            type: BuiltInPolicyType.COMPOSITE,
            built_in: true,
            realm_id: null,
        },
        extraAttributes: {
            decisionStrategy: DecisionStrategy.UNANIMOUS,
        },
        children: [
            {
                attributes: {
                    name: SystemPolicyName.IDENTITY,
                    type: BuiltInPolicyType.IDENTITY,
                    built_in: true,
                    realm_id: null,
                },
            },
            {
                attributes: {
                    name: SystemPolicyName.PERMISSION_BINDING,
                    type: BuiltInPolicyType.PERMISSION_BINDING,
                    built_in: true,
                    realm_id: null,
                },
            },
            {
                attributes: {
                    name: SystemPolicyName.REALM_MATCH,
                    type: BuiltInPolicyType.REALM_MATCH,
                    built_in: true,
                    realm_id: null,
                },
                extraAttributes: {
                    attributeName: ['realm_id'],
                    attributeNameStrict: false,
                    identityMasterMatchAll: true,
                },
            },
        ],
    };
}
