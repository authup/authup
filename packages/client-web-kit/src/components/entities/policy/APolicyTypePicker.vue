<script lang="ts">
import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import type { FormSelectOption } from '@vuecs/form-controls';
import { BuiltInPolicyType } from '@authup/access';

export default defineComponent({
    props: {
        type: {
            type: String,
        },
        types: {
            type: Array as PropType<(FormSelectOption | string)[]>,
        },
    },
    emits: ['pick'],
    setup(props, setup) {
        const option = ref<string | null>(null);
        const options = computed<FormSelectOption[]>(() => {
            if (props.types) {
                return props.types.map((type) => {
                    if (typeof type === 'string') {
                        return { id: type, value: type } satisfies FormSelectOption;
                    }

                    return type;
                });
            }

            return Object.values(BuiltInPolicyType)
                .map((type: string) => ({
                    id: type,
                    value: type,
                } satisfies FormSelectOption));
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
    <div class="d-flex flex-column gap-2">
        <div>
            <h6>Type</h6>

            <div class="d-flex flex-row gap-2 flex-wrap">
                <template
                    v-for="(item, key) in options"
                    :key="key"
                >
                    <div
                        :class="{'active': item.id === option}"
                        class="d-flex flex-column gap-1 text-center a-picker-item"
                        @click.prevent="pick(`${item.id}`)"
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
<style scoped>
.a-picker-item {
    cursor: pointer;
    border-radius: 4px;
    min-width: 120px;
    color: #5b646c;
    background-color: #ececec;
    padding: 0.5rem;
}

.a-picker-item.active,
.a-picker-item:hover,
.a-picker-item:active {
    background-color: #6d7fcc;
    color: #fff;
}
</style>
