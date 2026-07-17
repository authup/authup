<script lang="ts">
import {
    type PropType,
    computed,
    defineComponent,
    reactive,
} from 'vue';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { assignFormProperties, useTranslations } from '../../../../core';
import type { Policy } from '@authup/core-kit';
import type { FormOption } from '@vuecs/forms';
import { VCFormGroup, VCFormInput, VCFormSelect } from '@vuecs/forms';
import {
    TimePolicyInterval,
    isIntervalForDayOfMonth,
    isIntervalForDayOfWeek,
    isIntervalForDayOfYear,
} from '@authup/access';
import type { TimePolicy } from '@authup/access';
import { onChange, useUpdatedAt } from '../../../../composables';
import { IFieldValidation } from '@ilingo/validup-vue';

export default defineComponent({
    components: {
        VCFormInput,
        VCFormGroup,
        VCFormSelect,

        IFieldValidation,
    },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            start: '',
            end: '',
            interval: '',
            dayOfWeek: '',
            dayOfMonth: '',
            dayOfYear: '',
        });

        const intervalOptions: FormOption[] = Object.values(TimePolicyInterval)
            .map((el) => ({
                label: el,
                value: el,
            } satisfies FormOption));

        const v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.START, 
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.END, 
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.INTERVAL, 
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.DAY_OF_WEEK, 
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.DAY_OF_MONTH, 
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.DAY_OF_YEAR, 
            },
        ]);

        function assign(data: Partial<TimePolicy> = {}) {
            assignFormProperties(form, data as Record<string, unknown>, { fields: v.fields });
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(() => props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const displayIntervalForDayOfWeek = computed(
            () => isIntervalForDayOfWeek(v.fields.interval.$model.value),
        );

        const displayIntervalForDayOfMonth = computed(
            () => isIntervalForDayOfMonth(v.fields.interval.$model.value),
        );

        const displayIntervalForDayOfYear = computed(
            () => isIntervalForDayOfYear(v.fields.interval.$model.value),
        );

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !v.$invalid.value,
            });
        };

        const handleIntervalUpdated = (value: string) => {
            if (!isIntervalForDayOfWeek(value)) {
                v.fields.dayOfWeek.$model.value = '';
            }
            if (!isIntervalForDayOfMonth(value)) {
                v.fields.dayOfMonth.$model.value = '';
            }
            if (!isIntervalForDayOfYear(value)) {
                v.fields.dayOfYear.$model.value = '';
            }
            handleUpdated();
        };

        return {
            handleUpdated,
            handleIntervalUpdated,
            displayIntervalForDayOfWeek,
            displayIntervalForDayOfMonth,
            displayIntervalForDayOfYear,
            intervalOptions,
            v,
            translationsDefault,
        };
    },
});
</script>
<template>
    <div>
        <div class="flex flex-wrap -mx-2">
            <div class="flex-1 basis-0 px-2">
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
                            placeholder="HH:MM"
                            @change="handleUpdated"
                        />
                    </VCFormGroup>
                </IFieldValidation>
            </div>
            <div class="flex-1 basis-0 px-2">
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
                            placeholder="HH:MM"
                            @change="handleUpdated"
                        />
                    </VCFormGroup>
                </IFieldValidation>
            </div>
        </div>
        <div class="flex flex-wrap -mx-2">
            <div class="flex-1 basis-0 px-2">
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.interval"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.interval }}
                        </template>
                        <VCFormSelect
                            v-model="v.fields.interval.$model.value"
                            :options="intervalOptions"
                            placeholder="-- None --"
                            @update:model-value="handleIntervalUpdated"
                        />
                    </VCFormGroup>
                </IFieldValidation>
            </div>
            <div
                v-if="displayIntervalForDayOfWeek"
                class="flex-1 basis-0 px-2"
            >
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.dayOfWeek"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.dayOfWeek }}
                        </template>
                        <VCFormInput
                            v-model="v.fields.dayOfWeek.$model.value"
                            placeholder="0-6"
                            type="number"
                            @change="handleUpdated"
                        />
                    </VCFormGroup>
                </IFieldValidation>
            </div>
            <div
                v-if="displayIntervalForDayOfMonth"
                class="flex-1 basis-0 px-2"
            >
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.dayOfMonth"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.dayOfMonth }}
                        </template>
                        <VCFormInput
                            v-model="v.fields.dayOfMonth.$model.value"
                            placeholder="1-31"
                            type="number"
                            @change="handleUpdated"
                        />
                    </VCFormGroup>
                </IFieldValidation>
            </div>
            <div
                v-if="displayIntervalForDayOfYear"
                class="flex-1 basis-0 px-2"
            >
                <IFieldValidation
                    v-slot="{ value }"
                    :field="v.fields.dayOfYear"
                >
                    <VCFormGroup :validation="value">
                        <template #label>
                            {{ translationsDefault.dayOfYear }}
                        </template>
                        <VCFormInput
                            v-model="v.fields.dayOfYear.$model.value"
                            type="number"
                            placeholder="1-365"
                            @change="handleUpdated"
                        />
                    </VCFormGroup>
                </IFieldValidation>
            </div>
        </div>
    </div>
</template>
