<script lang="ts">
import type { AttributeNamesPolicy } from '@authup/access';
import type { Policy } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../../composables';
import { extendObjectProperties } from '../../../core';
import AAttributeNamesPolicyName from './AAttributeNamesPolicyName.vue';

export default defineComponent({
    components: {
        AAttributeNamesPolicyName,
    },
    props: {
        entity: {
            type: Object as PropType<Partial<Policy>>,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            names: [],
        });

        const vuelidate = useVuelidate({
            names: {},
        }, form, {
            $registerAs: 'type',
        });

        function assign(data: Partial<AttributeNamesPolicy> = {}) {
            extendObjectProperties(form, data as Record<string, any>);
        }

        setup.expose({
            assign,
        });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const canAdd = computed(() => {
            const names = vuelidate.value.names.$model;
            if (names.length === 0) {
                return true;
            }

            const lastEl = names[names.length - 1];
            return lastEl && lastEl.trim() !== '';
        });

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !vuelidate.value.$invalid,
            });
        };

        return {
            canAdd,
            handleUpdated,
            vuelidate,
        };
    },
});
</script>
<template>
    <div>
        <VCFormGroup>
            <template #label>
                Attributes
            </template>

            <template
                v-for="(item, key) in vuelidate.names.$model"
                :key="key"
            >
                <AAttributeNamesPolicyName
                    :disabled="vuelidate.names.$model.length <= 1"
                    :name="item"
                    @updated="(input) => { vuelidate.names.$model[key] = input; handleUpdated() }"
                    @deleted="() => { vuelidate.names.$model.splice(key, 1); handleUpdated() }"
                />
            </template>

            <div>
                <button
                    class="btn btn-xs btn-block btn-primary"
                    type="button"
                    :disabled="!canAdd"
                    @click.prevent="vuelidate.names.$model.push('')"
                >
                    <i class="fa fa-plus" />
                </button>
            </div>
        </VCFormGroup>
    </div>
</template>
