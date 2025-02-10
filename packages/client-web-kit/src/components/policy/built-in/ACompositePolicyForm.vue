<script lang="ts">
import { minLength, required } from '@vuelidate/validators';
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import {
    type PropType, computed, defineComponent, reactive,
} from 'vue';
import useVuelidate from '@vuelidate/core';
import type { Policy } from '@authup/core-kit';
import { IVuelidate } from '@ilingo/vuelidate';
import { VCFormGroup } from '@vuecs/form-controls';
import type { CompositePolicy } from '@authup/access';
import { onChange, useUpdatedAt } from '../../../composables';
import { APolicyChildrenPicker } from '../APolicyChildrenPicker';

export default defineComponent({
    components: {
        APolicyChildrenPicker,
        VCFormGroup,
        IVuelidate,
    },
    props: {
        entity: {
            type: Object as PropType<Partial<Policy>>,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive<{ children: string[] }>({
            children: [],
        });

        const vuelidate = useVuelidate({
            children: {
                minLength: minLength(1),
                $each: {
                    required,
                },
            },
        }, form, {
            $registerAs: 'type',
        });

        const query = computed<BuildInput<Policy & { parent_id?: string | null }>>(() => {
            const filters : FiltersBuildInput<Policy & { parent_id?: string | null }> = {};
            if (props.entity) {
                filters.id = `!${props.entity.id}`;
                // todo: maybe respect manual realmId component prop
                if (props.entity.realm_id) {
                    filters.realm_id = props.entity.realm_id;
                }

                filters.parent_id = [null, props.entity.id];
            } else {
                filters.parent_id = null;
            }

            return {
                filters,
                sort: {
                    name: 'ASC',
                },
            };
        });

        function assign(data: Partial<CompositePolicy> = {}) {
            if (data.children) {
                form.children = data.children.map((child) => child.id);
            }
        }

        setup.expose({
            assign,
        });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = (children: string[]) => {
            form.children = [...children];

            setup.emit('updated', {
                data: form,
                valid: !vuelidate.value.$invalid,
            });
        };

        return {
            handleUpdated,

            vuelidate,

            query,
        };
    },
});
</script>
<template>
    <div>
        <IVuelidate :validation="vuelidate.children">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Children
                    </template>
                    <!-- todo: condition parent_id = null, realm_id = equal ? -->
                    <APolicyChildrenPicker
                        :query="query"
                        :value="vuelidate.children.$model"
                        @changed="handleUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
    </div>
</template>
