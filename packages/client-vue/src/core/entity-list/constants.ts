/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SlotName } from '@vue-layout/list-controls';

export enum EntityListSlotName {
    BODY = SlotName.BODY,
    ITEM = SlotName.ITEM,
    ITEM_ACTIONS = SlotName.ITEM_ACTIONS,
    ITEM_ACTIONS_EXTRA = SlotName.ITEM_ACTIONS_EXTRA,
    HEADER = SlotName.HEADER,
    HEADER_TITLE = 'headerTitle',
    HEADER_SEARCH = 'headerSearch',
    FOOTER = SlotName.FOOTER,
}
