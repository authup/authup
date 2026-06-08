<script lang="ts">
import { type PropType, defineComponent, reactive } from 'vue';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    assignFormProperties,
    useTranslationsForNamespace,
} from '../../../../core';
import type { Policy } from '@authup/core-kit';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import type { DatePolicy } from '@authup/access';
import { onChange, useUpdatedAt } from '../../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        VCFormInput, 
        VCFormGroup, 
        IFieldValidation, 
    },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            start: '',
            end: '',
        });

        // No backend validator covers date-policy attributes today —
        // an empty `Container` registers the child slot ('type') with
        // the parent `<APolicyForm>` collector so it can extract this
        // form's state via `extractValidupResultsFromChild('type')`.
        const v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.START },
                { key: TranslatorTranslationDefaultKey.END },
            ],
        );

        function assign(data: Partial<DatePolicy> = {}) {
            assignFormProperties(form, data as Record<string, unknown>);
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
            handleUpdated,
            v,
            translationsDefault,
        };
    },
});
</script>
<template>
    <div>
        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.start"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translationsDefault.start }}
                </template>
                <VCFormInput
                    v-model="v.fields.start.$model.value"
                    placeholder="YYYY-MM-DD"
                    @change="handleUpdated"
                />
            </VCFormGroup>
        </IFieldValidation>

        <IFieldValidation
            v-slot="{ value }"
            :field="v.fields.end"
        >
            <VCFormGroup :validation="value">
                <template #label>
                    {{ translationsDefault.end }}
                </template>
                <VCFormInput
                    v-model="v.fields.end.$model.value"
                    placeholder="YYYY-MM-DD"
                    @change="handleUpdated"
                />
            </VCFormGroup>
        </IFieldValidation>
    </div>
</template>
