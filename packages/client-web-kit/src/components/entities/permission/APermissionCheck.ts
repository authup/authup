/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationOptions } from '@authup/access';
import { definePolicyData } from '@authup/access';
import { 
    SlotName, 
    createPermissionCheckerReactiveFn, 
    hasNormalizedSlot, 
    normalizeSlot,  
} from '../../../core';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export const APermissionCheck = defineComponent({
    props: {
        name: {
            type: [String, Array] as PropType<string | string[]>,
            required: true,
        },
        input: { type: Object as PropType<Record<string, any>> },
        options: { type: Object as PropType<PermissionEvaluationOptions> },
    },
    setup(props, { slots }) {
        const fn = createPermissionCheckerReactiveFn();

        // single setup-time call (the checker registers lifecycle hooks and
        // returns a Ref<boolean>) — wrapping it in computed() would truth-test
        // the inner Ref object and render the slot unconditionally.
        const isPermitted = fn({
            name: props.name,
            data: definePolicyData(props.input),
            options: props.options,
        });

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
