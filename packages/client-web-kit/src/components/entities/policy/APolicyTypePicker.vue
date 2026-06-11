<script lang="ts">
import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import type { FormOption } from '@vuecs/forms';
import { BuiltInPolicyType } from '@authup/access';

export default defineComponent({
    props: {
        type: { type: String },
        types: { type: Array as PropType<(FormOption | string)[]> },
    },
    emits: ['pick'],
    setup(props, setup) {
        const option = ref<string | null>(null);
        const options = computed<FormOption[]>(() => {
            if (props.types) {
                return props.types.map((type) => {
                    if (typeof type === 'string') {
                        return {
                            label: type,
                            value: type,
                        } satisfies FormOption;
                    }

                    return type;
                });
            }

            return Object.values(BuiltInPolicyType)
                .map((type: string) => ({
                    label: type,
                    value: type,
                } satisfies FormOption));
        });

        if (props.type) {
            option.value = props.type;
        }

        const pick = (val: string) => {
            option.value = val;
            setup.emit('pick', val);
        };

        return {
            option,
            options,
            pick,
        };
    },
});
</script>
<template>
    <div class="flex flex-col gap-2">
        <div>
            <h6>Type</h6>

            <div class="flex flex-row gap-2 flex-wrap">
                <template
                    v-for="(item, key) in options"
                    :key="key"
                >
                    <div
                        :class="{'active': item.value === option}"
                        class="flex flex-col gap-1 text-center a-picker-item"
                        @click.prevent="pick(`${item.value}`)"
                    >
                        <div>
                            {{ item.value }}
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
