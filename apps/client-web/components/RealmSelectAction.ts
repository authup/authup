/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import type { Realm } from '@authup/core-kit';
import { computed, resolveComponent } from 'vue';
import type { PropType } from 'vue';

export default defineNuxtComponent({
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

        const VCIcon = resolveComponent('VCIcon');

        return () => {
            if (canCheck.value) {
                return h('button', {
                    class: {
                        'btn btn-xs btn-primary': canCheck.value,
                        'btn btn-xs btn-danger': !canCheck.value,
                    },
                    onClick($event: any) {
                        $event.preventDefault();

                        emit('update:modelValue', props.entity.id);
                    },
                }, [
                    h(VCIcon, { name: canCheck.value ? 'fa6-solid:check' : 'fa6-solid:xmark' }),
                ]);
            }

            return h('button', {
                class: 'btn btn-xs btn-disabled btn-success',
                disabled: true,
            }, [
                h(VCIcon, { name: 'fa6-solid:check' }),
            ]);
        };
    },
});
