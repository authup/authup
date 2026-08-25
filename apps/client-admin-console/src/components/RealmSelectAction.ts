/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import type { Realm } from '@authup/core-kit';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import {
    computed,
    defineComponent,
    h,
    toRef,
} from 'vue';
import type { PropType } from 'vue';

export default defineComponent({
    props: {
        listRef: { type: Object },
        entity: {
            type: Object as PropType<Realm>,
            required: true,
        },
        modelValue: { type: String },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const modelValue = toRef(props, 'modelValue');

        const isMaster = computed(() => props.entity.name === REALM_MASTER_NAME);
        const canCheck = computed(() => !(isMaster.value && !modelValue.value) &&
                modelValue.value !== props.entity.id);

        return () => {
            if (canCheck.value) {
                return h(VCButton, {
                    size: 'sm',
                    color: 'primary',
                    onClick($event: any) {
                        $event.preventDefault();

                        emit('update:modelValue', props.entity.id);
                    },
                }, () => [
                    h(VCIcon, { name: 'fa6-solid:check' }),
                ]);
            }

            return h(VCButton, {
                size: 'sm',
                color: 'success',
                disabled: true,
            }, () => [
                h(VCIcon, { name: 'fa6-solid:check' }),
            ]);
        };
    },
});
