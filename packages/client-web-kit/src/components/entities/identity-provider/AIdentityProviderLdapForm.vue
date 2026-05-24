<!--
  - Copyright (c) 2024-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider } from '@authup/core-kit';
import { EntityType, IdentityProviderProtocol } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent,
    ref,
} from 'vue';
import { useIsEditing } from '../../../composables';
import { extractVuelidateResultsFromChild } from '../../../core';
import {
    AFormSubmit,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { AIdentityProviderBasicFields } from './AIdentityProviderBasicFields.vue';
import { AIdentityProviderLdapConnectionFields } from './AIdentityProviderLdapConnectionFields.vue';
import { AIdentityProviderLdapCredentialsFields } from './AIdentityProviderLdapCredentialsFields.vue';
import { AIdentityProviderLdapGroupFields } from './AIdentityProviderLdapGroupFields.vue';
import { AIdentityProviderLdapUserFields } from './AIdentityProviderLdapUserFields.vue';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';

export const AIdentityProviderLdapForm = defineComponent({
    components: {
        AFormSubmit,
        AIdentityProviderBasicFields,
        AIdentityProviderLdapConnectionFields,
        AIdentityProviderLdapCredentialsFields,
        AIdentityProviderLdapGroupFields,
        AIdentityProviderLdapUserFields,
        AIdentityProviderProtocol,
    },
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: false,
            default: undefined,
        },
        realmId: {
            type: String,
            default: undefined,
        },
    },
    emits: defineEntityVEmitOptions<IdentityProvider>(),
    setup(props, ctx) {
        const manager = defineEntityManager({
            type: `${EntityType.IDENTITY_PROVIDER}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const busy = ref(false);
        const $v = useVuelidate({ $stopPropagation: true });

        const submit = async () => {
            if (busy.value || $v.value.$invalid) {
                return;
            }

            busy.value = true;
            try {
                const data: Partial<IdentityProvider> = {
                    ...extractVuelidateResultsFromChild($v, 'basic'),
                    ...extractVuelidateResultsFromChild($v, 'connection'),
                    ...extractVuelidateResultsFromChild($v, 'credentials'),
                    ...extractVuelidateResultsFromChild($v, 'group'),
                    ...extractVuelidateResultsFromChild($v, 'user'),
                    protocol: IdentityProviderProtocol.LDAP,
                };

                await manager.createOrUpdate(data);
            } finally {
                busy.value = false;
            }
        };

        return {
            data: manager.data,
            busy,
            vuelidate: $v,
            isEditing,
            ldapProtocol: IdentityProviderProtocol.LDAP,
            submit,
        };
    },
});

export default AIdentityProviderLdapForm;
</script>

<template>
    <form @submit.prevent="submit">
        <AIdentityProviderProtocol
            v-if="!data"
            :id="ldapProtocol"
            :key="ldapProtocol"
        >
            <template #default="element">
                <div>
                    <h4 class="mb-3">
                        <i
                            :class="[element.icon, 'pe-1']"
                        /> {{ element.name }}
                    </h4>
                </div>
            </template>
        </AIdentityProviderProtocol>

        <div class="row">
            <div class="col">
                <h6>
                    <i class="fa fa-wrench" /> Basic
                </h6>
                <AIdentityProviderBasicFields :entity="data" />
            </div>
            <div class="col">
                <h6>
                    <i class="fa fa-lock" /> Security
                </h6>
                <AIdentityProviderLdapCredentialsFields :entity="data" />
            </div>
        </div>

        <h6>
            <i class="fa-solid fa-vihara" /> Connection
        </h6>
        <AIdentityProviderLdapConnectionFields :entity="data" />

        <div class="row">
            <div class="col">
                <h6>
                    <i class="fas fa-user" /> User
                </h6>
                <AIdentityProviderLdapUserFields :entity="data" />
            </div>
            <div class="col">
                <h6>
                    <i class="fa-solid fa-theater-masks" /> Group
                </h6>
                <AIdentityProviderLdapGroupFields :entity="data" />
            </div>
        </div>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="vuelidate.$invalid"
            @submit="submit"
        />
    </form>
</template>
