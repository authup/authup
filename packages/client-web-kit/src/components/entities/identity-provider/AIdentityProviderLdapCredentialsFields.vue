<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider, LdapIdentityProvider } from '@authup/core-kit';
import { assignFormProperties } from '../../../core';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { useFieldValidation } from '@ilingo/validup-vue';
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import { onChange, useUpdatedAt } from '../../../composables';

export const AIdentityProviderLdapCredentialsFields = defineComponent({
    components: { VCFormGroup, VCFormInput },
    props: {
        entity: { type: Object as PropType<Partial<LdapIdentityProvider>> },
        discovery: { type: Boolean, default: false },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({ user: '', password: '' });

        const v = useValidup(new Container<typeof form>(), form, { name: 'credentials' });

        function init() {
            if (!props.entity) return;
            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());
        init();

        return { v, useFieldValidation };
    },
});

export default AIdentityProviderLdapCredentialsFields;
</script>

<template>
    <div>
        <VCFormGroup :validation="useFieldValidation(v.fields.user)">
            <template #label>
                User
            </template>
            <VCFormInput v-model="v.fields.user.$model.value" />
        </VCFormGroup>
        <VCFormGroup :validation="useFieldValidation(v.fields.password)">
            <template #label>
                Password
            </template>
            <VCFormInput
                v-model="v.fields.password.$model.value"
                type="password"
                autocomplete="current-password"
            />
        </VCFormGroup>
    </div>
</template>
