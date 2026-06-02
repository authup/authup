<script lang="ts">
import { type PropType, defineComponent, reactive } from 'vue';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import type { Policy } from '@authup/core-kit';
import { VCFormGroup, VCFormSwitch } from '@vuecs/forms';
import type { RealmMatchPolicy } from '@authup/access';
import { assignFormProperties } from '../../../../core';
import { onChange, useUpdatedAt } from '../../../../composables';
import AFormInputList from '../../../utility/form-input-list/AFormInputList.vue';

export default defineComponent({
    components: {
        AFormInputList, 
        VCFormGroup, 
        VCFormSwitch, 
    },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            attribute_name_strict: false,
            attribute_null_match_all: false,
            identity_master_match_all: false,
            attribute_name: [] as string[],
        });

        const $v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        function assign(input: Partial<RealmMatchPolicy> = {}) {
            const { attribute_name, ...data } = input;
            assignFormProperties(form, data as Record<string, unknown>);
            if (attribute_name) {
                form.attribute_name = typeof attribute_name === 'string' ? [attribute_name] : attribute_name;
            } else {
                form.attribute_name = [];
            }
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !$v.$invalid.value,
            });
        };

        const handleAttributeNameChanged = (data: string[]) => {
            form.attribute_name = data;
            handleUpdated();
        };

        return {
            handleUpdated,
            handleAttributeNameChanged,
            $v,
            useFieldValidation,
        };
    },
});
</script>
<template>
    <div class="row">
        <div class="col-7">
            <VCFormGroup :validation="useFieldValidation($v.fields.attribute_name!)">
                <AFormInputList
                    :names="$v.fields.attribute_name!.$model.value"
                    @changed="handleAttributeNameChanged"
                />
            </VCFormGroup>
        </div>
        <div class="col-5">
            <VCFormGroup :validation="useFieldValidation($v.fields.attribute_name_strict!)">
                <VCFormSwitch
                    v-model="$v.fields.attribute_name_strict!.$model.value"
                    :label="true"
                    @change="handleUpdated"
                >
                    <template #label="iProps">
                        <label :for="iProps.id">
                            Only match if the attribute is strict equal to the name?
                        </label>
                    </template>
                </VCFormSwitch>
            </VCFormGroup>
            <VCFormGroup :validation="useFieldValidation($v.fields.attribute_null_match_all!)">
                <VCFormSwitch
                    v-model="$v.fields.attribute_null_match_all!.$model.value"
                    :label="true"
                    @change="handleUpdated"
                >
                    <template #label="iProps">
                        <label :for="iProps.id">
                            Determines if resources with null realm-id/name value should match all identity realms.<br>
                            If true, any identity realm can access resources with null realm-id/name values.
                        </label>
                    </template>
                </VCFormSwitch>
            </VCFormGroup>
            <VCFormGroup :validation="useFieldValidation($v.fields.identity_master_match_all!)">
                <VCFormSwitch
                    v-model="$v.fields.identity_master_match_all!.$model.value"
                    :label="true"
                    @change="handleUpdated"
                >
                    <template #label="iProps">
                        <label :for="iProps.id">
                            Specifies whether the master realm of an identity should match all realm-id/name attributes, including null.<br>
                            If true, the master realm can access any resource regardless of its realm value.
                        </label>
                    </template>
                </VCFormSwitch>
            </VCFormGroup>
        </div>
    </div>
</template>
