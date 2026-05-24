<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import { assignFormProperties } from '../../../core';
import useVuelidate from '@vuelidate/core';
import { numeric, required } from '@vuelidate/validators';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { IVuelidate } from '@ilingo/vuelidate';
import { onChange, useUpdatedAt } from '../../../composables';

export const AIdentityProviderLdapConnectionFields = defineComponent({
    components: {
        IVuelidate,
        VCFormGroup,
        VCFormInput,
        VCFormSwitch,
    },
    props: {
        entity: { type: Object as PropType<Partial<LdapIdentityProvider>> },
        discovery: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            url: '',
            timeout: 0,
            start_tls: true,
            base_dn: '',
        });

        const $v = useVuelidate({
            url: { required },
            timeout: { numeric },
            start_tls: { required },
            base_dn: { required },
        }, form, { $registerAs: 'connection' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const onTimeoutChange = (input: string) => {
            if (input.trim() === '') {
                $v.value.timeout.$model = 0;
                return;
            }
            const intValue = Number.parseInt(input, 10);
            $v.value.timeout.$model = Number.isNaN(intValue) ? 0 : intValue;
        };

        return {
            vuelidate: $v,
            onTimeoutChange,
        };
    },
});

export default AIdentityProviderLdapConnectionFields;
</script>

<template>
    <div>
        <IVuelidate :validation="vuelidate.url">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        URL
                    </template>
                    <VCFormInput
                        v-model="vuelidate.url.$model"
                        placeholder="<scheme>://<address>:<port>"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <IVuelidate :validation="vuelidate.timeout">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Timeout
                    </template>
                    <VCFormInput
                        :model-value="String(vuelidate.timeout.$model)"
                        type="number"
                        @update:model-value="onTimeoutChange"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <IVuelidate :validation="vuelidate.start_tls">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        StartTLS
                    </template>
                    <VCFormSwitch
                        v-model="vuelidate.start_tls.$model"
                        :label="true"
                        label-content="Enable StartTLS process?"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>

        <IVuelidate :validation="vuelidate.base_dn">
            <template #default="props">
                <VCFormGroup
                    :validation-messages="props.data"
                    :validation-severity="props.severity"
                >
                    <template #label>
                        Base DN
                    </template>
                    <VCFormInput
                        v-model="vuelidate.base_dn.$model"
                        placeholder="e.g. dc=example,dc=com"
                    />
                </VCFormGroup>
            </template>
        </IVuelidate>
    </div>
</template>
