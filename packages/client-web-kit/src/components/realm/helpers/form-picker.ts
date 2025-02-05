/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildFormGroup } from '@vuecs/form-controls';
import { SlotName } from '@vuecs/list-controls';
import type { VNode } from 'vue';
import { h } from 'vue';
import type { ResourceCollectionVSlots } from '../../../core';
import {
    APagination,
    ASearch,
    renderToggleButton,
} from '../../utility';
import { ARealms } from '../ARealms';

type RealmForm = {
    realm_id: string
};

export function createRealmFormPicker(form: RealmForm) : VNode {
    return buildFormGroup({
        label: true,
        labelContent: 'Realm',
        content: h(ARealms, {}, {
            [SlotName.HEADER]: (props: ResourceCollectionVSlots<{ id: string }>['header']) => [
                h(ASearch, {
                    load: (payload: any) => {
                        if (props.load) {
                            return props.load(payload);
                        }

                        return undefined;
                    },
                    busy: props.busy,
                }),
            ],
            [SlotName.FOOTER]: (props: ResourceCollectionVSlots<{ id: string }>['footer']) => [
                h(APagination, {
                    load: (payload: any) => {
                        if (props.load) {
                            return props.load(payload);
                        }

                        return undefined;
                    },
                    busy: props.busy,
                    meta: props.meta,
                }),
            ],
            [SlotName.ITEM_ACTIONS]: (
                props: ResourceCollectionVSlots<{ id: string }>['itemActions'],
            ) => renderToggleButton({
                value: form.realm_id === props.data.id,
                isBusy: props.busy,
                changed(value) {
                    if (value) {
                        form.realm_id = props.data.id;
                    } else {
                        form.realm_id = '';
                    }
                },
            }),
        }),
    });
}
