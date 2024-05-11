/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import { buildFormGroup } from '@vuecs/form-controls';
import { SlotName } from '@vuecs/list-controls';
import type { VNode } from 'vue';
import { h } from 'vue';
import { renderEntityAssignAction } from '../../../core';
import { ARealms } from '../ARealms';

type RealmForm = {
    realm_id: string
};

export function createRealmFormPicker(form: RealmForm) : VNode {
    return buildFormGroup({
        label: true,
        labelContent: 'Realm',
        content: h(ARealms, {}, {
            [SlotName.ITEM_ACTIONS]: (
                props: { data: Realm, busy: boolean },
            ) => renderEntityAssignAction({
                item: form.realm_id === props.data.id,
                busy: props.busy,
                add() {
                    form.realm_id = props.data.id;
                },
                drop() {
                    form.realm_id = '';
                },
            }),
        }),
    });
}
