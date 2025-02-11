<script lang="ts">
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent, reactive,
} from 'vue';
import AInputListFormItem from './AInputListFormItem.vue';

export default defineComponent({
    components: {
        AInputListFormItem,
    },
    props: {
        names: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
        minItems: {
            type: Number,
            default: 0,
        },
    },
    emits: ['changed'],
    setup(props, setup) {
        const form = reactive<{ names: string[] }>({
            names: [],
        });

        const vuelidate = useVuelidate({
            names: {},
        }, form, {
            $registerAs: 'inputList',
        });

        const add = () => {
            vuelidate.value.names.$model.push('');
        };

        function assign() {
            form.names = props.names;

            if (form.names.length < props.minItems) {
                for (let i = 0; i < props.minItems - form.names.length; i++) {
                    add();
                }
            }
        }

        setup.expose({
            assign,
        });

        assign();

        const canAdd = computed(() => {
            const names = vuelidate.value.names.$model;
            if (names.length === 0) {
                return true;
            }

            const lastEl = names[names.length - 1];
            return lastEl && lastEl.trim() !== '';
        });

        const emitUpdated = () => {
            setup.emit('changed', {
                data: [
                    ...form.names.filter(Boolean),
                ],
                valid: !vuelidate.value.$invalid,
            });
        };

        const handleUpdated = (index: number, value: string) => {
            vuelidate.value.names.$model[index] = value;
            emitUpdated();
        };

        const handleDeleted = (index: number) => {
            if (vuelidate.value.names.$model <= props.minItems) {
                return;
            }

            vuelidate.value.names.$model.splice(index, 1);

            emitUpdated();
        };

        return {
            add,
            canAdd,

            handleDeleted,
            handleUpdated,

            vuelidate,
        };
    },
});
</script>
<template>
    <div class="d-flex flex-column gap-2">
        <div class="d-flex flex-row">
            <div class="align-self-end">
                <slot name="label">
                    Names
                </slot>
            </div>
            <div class="ms-auto">
                <button
                    class="btn btn-xs btn-primary"
                    type="button"
                    :disabled="!canAdd"
                    @click.prevent="add"
                >
                    <i class="fa fa-plus" /> Add
                </button>
            </div>
        </div>
        <div class="d-flex flex-column">
            <template
                v-for="(item, key) in vuelidate.names.$model"
                :key="key"
            >
                <AInputListFormItem
                    :disabled="vuelidate.names.$model.length <= 1"
                    :name="item"
                    @updated="(input) => { handleUpdated(key, input) }"
                    @deleted="() => { handleDeleted(key) }"
                />
            </template>
        </div>
    </div>
</template>
