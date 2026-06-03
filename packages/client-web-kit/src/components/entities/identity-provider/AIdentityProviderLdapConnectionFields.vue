<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import { assignFormProperties, useFieldValidation  } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput, VCFormSwitch } from '@vuecs/forms';
import { onChange, useUpdatedAt } from '../../../composables';

export const AIdentityProviderLdapConnectionFields = defineComponent({
    components: {
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

        const v = useValidup(new Container<typeof form>(), form, { name: 'connection' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const onTimeoutChange = (input: string) => {
            if (input.trim() === '') {
                v.fields.timeout.$model.value = 0;
                return;
            }
            const intValue = Number.parseInt(input, 10);
            v.fields.timeout.$model.value = Number.isNaN(intValue) ? 0 : intValue;
        };

        return {
            v,
            onTimeoutChange,
            useFieldValidation,
        };
    },
});

export default AIdentityProviderLdapConnectionFields;
</script>

<template>
    <div>
        <VCFormGroup :validation="useFieldValidation(v.fields.url)">
            <template #label>
                URL
            </template>
            <VCFormInput
                v-model="v.fields.url.$model.value"
                placeholder="<scheme>://<address>:<port>"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation(v.fields.timeout)">
            <template #label>
                Timeout
            </template>
            <VCFormInput
                :model-value="String(v.fields.timeout.$model.value)"
                type="number"
                @update:model-value="onTimeoutChange"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation(v.fields.start_tls)">
            <template #label>
                StartTLS
            </template>
            <VCFormSwitch
                v-model="v.fields.start_tls.$model.value"
                :label="true"
                label-content="Enable StartTLS process?"
            />
        </VCFormGroup>

        <VCFormGroup :validation="useFieldValidation(v.fields.base_dn)">
            <template #label>
                Base DN
            </template>
            <VCFormInput
                v-model="v.fields.base_dn.$model.value"
                placeholder="e.g. dc=example,dc=com"
            />
        </VCFormGroup>
    </div>
</template>
