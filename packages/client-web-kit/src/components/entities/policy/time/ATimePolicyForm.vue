<script lang="ts">
import {
    type PropType,
    computed,
    defineComponent,
    reactive,
} from 'vue';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { assignFormProperties, useFieldValidation  } from '../../../../core';
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

export default defineComponent({
    components: {
        VCFormInput, 
        VCFormGroup, 
        VCFormSelect, 
    },
    props: { entity: { type: Object as PropType<Partial<Policy>> } },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            start: '',
            end: '',
            interval: '',
            day_of_week: '',
            day_of_month: '',
            day_of_year: '',
        });

        const intervalOptions: FormOption[] = Object.values(TimePolicyInterval)
            .map((el) => ({
                label: el,
                value: el,
            } satisfies FormOption));

        const v = useValidup(new Container<typeof form>(), form, { name: 'type' });

        function assign(data: Partial<TimePolicy> = {}) {
            assignFormProperties(form, data as Record<string, unknown>);
        }

        setup.expose({ assign });

        const updatedAt = useUpdatedAt(props.entity as Policy);
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
                v.fields.day_of_week.$model.value = '';
            }
            if (!isIntervalForDayOfMonth(value)) {
                v.fields.day_of_month.$model.value = '';
            }
            if (!isIntervalForDayOfYear(value)) {
                v.fields.day_of_year.$model.value = '';
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
            useFieldValidation,
        };
    },
});
</script>
<template>
    <div>
        <div class="row">
            <div class="col">
                <VCFormGroup :validation="useFieldValidation(v.fields.start)">
                    <template #label>
                        Start
                    </template>
                    <VCFormInput
                        v-model="v.fields.start.$model.value"
                        placeholder="HH:MM"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </div>
            <div class="col">
                <VCFormGroup :validation="useFieldValidation(v.fields.end)">
                    <template #label>
                        End
                    </template>
                    <VCFormInput
                        v-model="v.fields.end.$model.value"
                        placeholder="HH:MM"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </div>
        </div>
        <div class="row">
            <div class="col">
                <VCFormGroup :validation="useFieldValidation(v.fields.interval)">
                    <template #label>
                        Interval
                    </template>
                    <VCFormSelect
                        v-model="v.fields.interval.$model.value"
                        :options="intervalOptions"
                        :option-default="true"
                        @change="handleIntervalUpdated"
                    />
                </VCFormGroup>
            </div>
            <div
                v-if="displayIntervalForDayOfWeek"
                class="col"
            >
                <VCFormGroup :validation="useFieldValidation(v.fields.day_of_week)">
                    <template #label>
                        Day of Week
                    </template>
                    <VCFormInput
                        v-model="v.fields.day_of_week.$model.value"
                        placeholder="0-6"
                        type="number"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </div>
            <div
                v-if="displayIntervalForDayOfMonth"
                class="col"
            >
                <VCFormGroup :validation="useFieldValidation(v.fields.day_of_month)">
                    <template #label>
                        Day of Month
                    </template>
                    <VCFormInput
                        v-model="v.fields.day_of_month.$model.value"
                        placeholder="1-31"
                        type="number"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </div>
            <div
                v-if="displayIntervalForDayOfYear"
                class="col"
            >
                <VCFormGroup :validation="useFieldValidation(v.fields.day_of_year)">
                    <template #label>
                        Day of Year
                    </template>
                    <VCFormInput
                        v-model="v.fields.day_of_year.$model.value"
                        type="number"
                        placeholder="1-365"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </div>
        </div>
    </div>
</template>
