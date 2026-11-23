/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';

export type RealmPickerLayout = 'grid' | 'list';

export type RealmPickerItemSlotProps = {
    realm: Realm,
    select: () => void,
};

export type RealmPickerSlots = {
    item: RealmPickerItemSlotProps,
};
