<script lang="ts">
import {
    type PropType, computed, defineComponent, reactive,
} from 'vue';
import useVuelidate from '@vuelidate/core';
import { maxValue, minValue } from '@vuelidate/validators';
import type { Policy } from '@authup/core-kit';
import { IVuelidate } from '@ilingo/vuelidate';
import type { FormSelectOption } from '@vuecs/form-controls';
import { VCFormGroup, VCFormInput } from '@vuecs/form-controls';
import {
    TimePolicyInterval,
    isIntervalForDayOfMonth,
    isIntervalForDayOfWeek,
    isIntervalForDayOfYear,
} from '@authup/access';
import type { TimePolicy } from '@authup/access';
import { assignFormProperties } from '../../../../core';
import { onChange, useUpdatedAt } from '../../../../composables';

export default defineComponent({
    components: {
        VCFormInput,
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
        const form = reactive({
            start: '',
            end: '',
            interval: '',
            dayOfWeek: '',
            dayOfMonth: '',
            dayOfYear: '',
        });

        const intervalOptions : FormSelectOption[] = Object.values(TimePolicyInterval)
            .map((el) => ({
                id: el,
                value: el,
            } satisfies FormSelectOption));

        const vuelidate = useVuelidate({
            start: {},
            end: {},
            interval: {},
            dayOfWeek: {
                minValue: minValue(0),
                maxValue: maxValue(6),
            },
            dayOfMonth: {
                minValue: minValue(1),
                maxValue: maxValue(31),
            },
            dayOfYear: {
                minValue: minValue(1),
                maxValue: maxValue(365),
            },
        }, form, {
            $registerAs: 'type',
        });

        function assign(data: Partial<TimePolicy> = {}) {
            assignFormProperties(form, data as Record<string, any>);
        }

        setup.expose({
            assign,
        });

        const updatedAt = useUpdatedAt(props.entity as Policy);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        const displayIntervalForDayOfWeek = computed(
            () => isIntervalForDayOfWeek(vuelidate.value.interval.$model),
        );

        const displayIntervalForDayOfMonth = computed(
            () => isIntervalForDayOfMonth(vuelidate.value.interval.$model),
        );

        const displayIntervalForDayOfYear = computed(
            () => isIntervalForDayOfYear(vuelidate.value.interval.$model),
        );

        const handleUpdated = () => {
            setup.emit('updated', {
                data: form,
                valid: !vuelidate.value.$invalid,
            });
        };

        const handleIntervalUpdated = (value: string) => {
            if (!isIntervalForDayOfWeek(value)) {
                vuelidate.value.dayOfWeek.$model = '';
            }

            if (!isIntervalForDayOfMonth(value)) {
                vuelidate.value.dayOfMonth.$model = '';
            }

            if (!isIntervalForDayOfYear(value)) {
                vuelidate.value.dayOfYear.$model = '';
            }

            handleUpdated();
        };

        return {
            handleUpdated,
            handleIntervalUpdated,

            intervalOptions,
            vuelidate,

            displayIntervalForDayOfWeek,
            displayIntervalForDayOfMonth,
            displayIntervalForDayOfYear,
        };
    },
});
</script>
<template>
    <div>
        <IVuelidate :validation="vuelidate.start">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Start
                    </template>
                    <VCFormInput
                        v-model="vuelidate.start.$model"
                        placeholder="00:00:00"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <IVuelidate :validation="vuelidate.end">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        End
                    </template>
                    <VCFormInput
                        v-model="vuelidate.end.$model"
                        placeholder="00:00:00"
                        @change="handleUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
        <IVuelidate :validation="vuelidate.interval">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Interval
                    </template>
                    <VCFormSelect
                        v-model="vuelidate.interval.$model"
                        :options="intervalOptions"
                        @change="handleIntervalUpdated"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <div class="row">
            <div
                v-if="displayIntervalForDayOfWeek"
                class="col"
            >
                <IVuelidate :validation="vuelidate.dayOfWeek">
                    <template #default="props">
                        <VCFormGroup
                            :validation-messages="props.data"
                            :validation-severity="props.severity"
                        >
                            <template #label>
                                Day of Week
                            </template>
                            <VCFormInput
                                v-model="vuelidate.dayOfWeek.$model"
                                placeholder="0-7"
                                type="number"
                                @change="handleUpdated"
                            />
                        </VCFormGroup>
                    </template>
                </IVuelidate>
            </div>
            <div
                v-if="displayIntervalForDayOfMonth"
                class="col"
            >
                <IVuelidate :validation="vuelidate.dayOfMonth">
                    <template #default="props">
                        <VCFormGroup
                            :validation-messages="props.data"
                            :validation-severity="props.severity"
                        >
                            <template #label>
                                Day of Month
                            </template>
                            <VCFormInput
                                v-model="vuelidate.dayOfMonth.$model"
                                placeholder="1-31"
                                type="number"
                                @change="handleUpdated"
                            />
                        </VCFormGroup>
                    </template>
                </IVuelidate>
            </div>
            <div
                v-if="displayIntervalForDayOfYear"
                class="col"
            >
                <IVuelidate :validation="vuelidate.dayOfYear">
                    <template #default="props">
                        <VCFormGroup
                            :validation-messages="props.data"
                            :validation-severity="props.severity"
                        >
                            <template #label>
                                Day of Year
                            </template>
                            <VCFormInput
                                v-model="vuelidate.dayOfYear.$model"
                                type="number"
                                placeholder="1-365"
                                @change="handleUpdated"
                            />
                        </VCFormGroup>
                    </template>
                </IVuelidate>
            </div>
        </div>
    </div>
</template>
