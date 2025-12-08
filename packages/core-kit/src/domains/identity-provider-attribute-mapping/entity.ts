/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderBaseMapping } from '../identity-provider';

export interface IdentityProviderAttributeMapping extends IdentityProviderBaseMapping {
    id: string;

    target_name: string;

    target_value: string | null;

    created_at: Date;

    updated_at: Date;
}
