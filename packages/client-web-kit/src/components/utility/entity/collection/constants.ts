/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import { SlotName } from '../../../../core';

/**
 * The field every entity's free-text search matches against.
 */
export const ENTITY_SEARCH_FIELD_DEFAULT = 'name';

/**
 * Extra fields the default free-text search matches alongside `name`, keyed
 * by entity type.
 *
 * This mirrors each entity's server-side `filters.allowed`
 * (`apps/server-core/src/core/entities/<entity>/schema.ts`). rapiq's v2
 * expression dialect resolves keys strictly and answers an unknown one with
 * `keyNotAllowed` (400) rather than pruning it, so naming a field a schema
 * does not allow turns search into a failed request instead of a narrower
 * one. Keep the two in step when a schema's allow-list changes.
 *
 * An entity absent here searches `name` alone. A page needing something
 * richer passes its own `queryFilters` hook, which wins over this map.
 */
export const ENTITY_SEARCH_FIELDS : Partial<Record<EntityType, string[]>> = {
    [EntityType.CLIENT]: ['displayName'],
    [EntityType.IDENTITY_PROVIDER]: ['displayName'],
    [EntityType.PERMISSION]: ['displayName'],
    [EntityType.POLICY]: ['displayName'],
    [EntityType.REALM]: ['displayName'],
    [EntityType.ROLE]: ['displayName'],
    [EntityType.SCOPE]: ['displayName'],
    [EntityType.USER]: ['displayName'],
};

export enum EntityCollectionSlotName {
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
