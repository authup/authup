/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionCheckerCheckOptions, PolicyData } from '@authup/access';
import { SlotName } from '@vuecs/list-controls';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { createPermissionCheckerReactiveFn, hasNormalizedSlot, normalizeSlot } from '../../core';

export const APermissionCheck = defineComponent({
    props: {
        name: {
            type: [String, Array] as PropType<string | string[]>,
            required: true,
        },
        data: {
            type: Object as PropType<PolicyData>,
        },
        options: {
            type: Object as PropType<PermissionCheckerCheckOptions>,
        },
    },
    setup(props, { slots }) {
        const fn = createPermissionCheckerReactiveFn();

        const isPermitted = computed(() => fn({
            name: props.name,
            data: props.data,
            options: props.options,
        }));

        return () => {
            if (
                isPermitted.value &&
                hasNormalizedSlot(SlotName.DEFAULT, slots)
            ) {
                return normalizeSlot(SlotName.DEFAULT, {}, slots);
            }

            return [];
        };
    },
});
