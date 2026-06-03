<script lang="ts">
import {
    type PropType,
    computed,
    defineComponent,
    reactive,
    toRef,
} from 'vue';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import { ValidatorGroup } from '@authup/kit';
import type { Policy } from '@authup/core-kit';
import { PolicyValidator } from '@authup/core-kit';
import type { FormOption } from '@vuecs/forms';
import {
    VCFormGroup,
    VCFormInput,
    VCFormSwitch,
    VCFormTextarea,
} from '@vuecs/forms';
import { BuiltInPolicyType } from '@authup/access';
import { assignFormProperties, injectStore, storeToRefs } from '../../../core';
import { onChange, useIsEditing, useUpdatedAt } from '../../../composables';
import { ARealmPicker } from '../realm';

export default defineComponent({
    components: {
        ARealmPicker,
        VCFormInput,
        VCFormSwitch,
        VCFormGroup,
        VCFormTextarea,
    },
    props: { entity: { type: Object as PropType<Policy> } },
    emits: ['updated'],
    setup(props, setup) {
        const entity = toRef(props, 'entity');
        const form = reactive({
            name: '',
            invert: false,
            display_name: '',
            description: '',
            realm_id: '',
        });

        const store = injectStore();
        const storeRefs = storeToRefs(store);

        const isEditing = useIsEditing(entity);
        const realmId = computed(() => {
            if (!storeRefs.realmIsRoot) {
                return storeRefs.realmId.value;
            }

            return entity.value ?
                entity.value.realm_id :
                null;
        });

        const typeOptions: FormOption[] = [
            ...Object.values(BuiltInPolicyType).map((type) => ({
                label: type,
                value: type,
            })),
        ];

        // Shared backend validator from @authup/core-kit. Registers
        // under the parent `<APolicyForm>` collector via `name: 'basic'`
        // so the parent extracts via `extractValidupResultsFromChild('basic')`.
        const v = useValidup(
            new PolicyValidator(),
            form,
            {
                name: 'basic',
                group: computed(() => (isEditing.value ? ValidatorGroup.UPDATE : ValidatorGroup.CREATE)),
            },
        );

        function assign(data: Partial<Policy> = {}) {
            assignFormProperties(form, data);
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !v.$invalid.value,
            });
        };

        return {
            isEditing,
            realmId,
            handleUpdated,
            typeOptions,
            v,
            useFieldValidation,
        };
    },
});
</script>
<template>
    <div class="row">
        <div class="col">
            <VCFormGroup :validation="useFieldValidation(v.fields.name)">
                <template #label>
                    Name
                </template>
                <VCFormInput
                    v-model="v.fields.name.$model.value"
                    @change="handleUpdated"
                />
            </VCFormGroup>
            <VCFormGroup :validation="useFieldValidation(v.fields.display_name)">
                <template #label>
                    Display Name
                </template>
                <VCFormInput
                    :model-value="v.fields.display_name.$model.value ?? ''"
                    @update:model-value="(next: string) => { v.fields.display_name.$model.value = next; }"
                    @change="handleUpdated"
                />
            </VCFormGroup>
            <VCFormGroup :validation="useFieldValidation(v.fields.description)">
                <template #label>
                    Description
                </template>
                <VCFormTextarea
                    :model-value="v.fields.description.$model.value ?? ''"
                    rows="4"
                    @update:model-value="(next: string) => { v.fields.description.$model.value = next; }"
                    @change="handleUpdated"
                />
            </VCFormGroup>
            <VCFormGroup :validation="useFieldValidation(v.fields.invert)">
                <VCFormSwitch
                    v-model="v.fields.invert.$model.value"
                    :label="true"
                    @change="handleUpdated"
                >
                    <template #label="iProps">
                        <label :for="iProps.id">
                            Invert?
                        </label>
                    </template>
                </VCFormSwitch>
            </VCFormGroup>
        </div>
        <div
            v-if="!realmId && !isEditing"
            class="col"
        >
            <VCFormGroup :validation="useFieldValidation(v.fields.realm_id)">
                <template #label>
                    Realm
                </template>
                <ARealmPicker
                    :value="v.fields.realm_id.$model.value"
                    @change="(value: string[]) => { v.fields.realm_id.$model.value = value.length > 0 ? value[0] ?? '' : ''; }"
                />
            </VCFormGroup>
        </div>
    </div>
</template>
