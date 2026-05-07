/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';

// Mirrors `RealmValidator` mounts in @authup/core-kit.
export type RealmCreatePayload = Pick<Realm, 'name'> &
    Partial<Pick<Realm, 'display_name' | 'description'>>;
export type RealmUpdatePayload = Partial<RealmCreatePayload>;
export type RealmSavePayload = RealmCreatePayload;
