/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';

// Mirrors `ScopeValidator` mounts in @authup/core-kit.
export type ScopeCreatePayload =    & Pick<Scope, 'name'> &
    Partial<Pick<Scope, 'display_name' | 'description' | 'realm_id'>>;
export type ScopeUpdatePayload = Partial<ScopeCreatePayload>;
export type ScopeSavePayload = ScopeCreatePayload;
