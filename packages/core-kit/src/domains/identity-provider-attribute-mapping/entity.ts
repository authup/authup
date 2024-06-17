/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderMappingRelation } from '../identity-provider';

export interface IdentityProviderAttributeMapping extends IdentityProviderMappingRelation {
    id: string;

    source_name: string | null;

    source_value: string | null;

    source_value_is_regex: boolean;

    target_name: string;

    target_value: string | null;

    created_at: Date;

    updated_at: Date;
}
