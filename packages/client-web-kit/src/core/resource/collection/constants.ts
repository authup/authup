/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SlotName } from '@vuecs/list-controls';

export enum ResourceCollectionSlotName {
    DEFAULT = SlotName.DEFAULT,
    BODY = SlotName.BODY,
    ITEM = SlotName.ITEM,
    ITEM_ACTIONS = SlotName.ITEM_ACTIONS,
    ITEM_ACTIONS_EXTRA = SlotName.ITEM_ACTIONS_EXTRA,
    HEADER = SlotName.HEADER,
    HEADER_SEARCH = 'headerSearch',
    HEADER_SEARCH_ICON = 'headerSearchIcon',
    HEADER_TITLE = 'headerTitle',
    HEADER_TITLE_ICON = 'headerTitleIcon',
    FOOTER = SlotName.FOOTER,
    NO_MORE = SlotName.NO_MORE,
    LOADING = SlotName.LOADING,
}
