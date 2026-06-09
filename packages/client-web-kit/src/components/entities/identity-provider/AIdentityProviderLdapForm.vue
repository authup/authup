<!--
  - Copyright (c) 2024-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider } from '@authup/core-kit';
import { EntityType, IdentityProviderProtocol } from '@authup/core-kit';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
} from 'vue';
import { useIsEditing } from '../../../composables';
import { extractValidupResultsFromChild } from '../../../core';
import {
    AFormSubmit,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import AIdentityProviderBasicFields from './AIdentityProviderBasicFields.vue';
import AIdentityProviderLdapConnectionFields from './AIdentityProviderLdapConnectionFields.vue';
import AIdentityProviderLdapCredentialsFields from './AIdentityProviderLdapCredentialsFields.vue';
import AIdentityProviderLdapGroupFields from './AIdentityProviderLdapGroupFields.vue';
import AIdentityProviderLdapUserFields from './AIdentityProviderLdapUserFields.vue';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';

export default defineComponent({
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
        // Parent collector — see APolicyForm for the same pattern.
        const v = useValidup(new Container(), reactive({}), { stopPropagation: true });

        const isInvalid = computed(() => {
            const slots = ['basic', 'connection', 'credentials', 'group', 'user'] as const;
            return slots.some((slot) => !!v.$getResultsForChild(slot)?.$invalid.value);
        });

        const submit = async () => {
            if (busy.value || isInvalid.value) {
                return;
            }

            busy.value = true;
            try {
                const data: Partial<IdentityProvider> = {
                    ...extractValidupResultsFromChild(v, 'basic'),
                    ...extractValidupResultsFromChild(v, 'connection'),
                    ...extractValidupResultsFromChild(v, 'credentials'),
                    ...extractValidupResultsFromChild(v, 'group'),
                    ...extractValidupResultsFromChild(v, 'user'),
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
            isEditing,
            isInvalid,
            ldapProtocol: IdentityProviderProtocol.LDAP,
            submit,
        };
    },
});

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
                        <VCIcon
                            :name="element.icon"
                            class="pe-1"
                        /> {{ element.name }}
                    </h4>
                </div>
            </template>
        </AIdentityProviderProtocol>

        <div class="row">
            <div class="col">
                <h6>
                    <VCIcon name="fa6-solid:wrench" /> Basic
                </h6>
                <AIdentityProviderBasicFields :entity="data" />
            </div>
            <div class="col">
                <h6>
                    <VCIcon name="fa6-solid:lock" /> Security
                </h6>
                <AIdentityProviderLdapCredentialsFields :entity="data" />
            </div>
        </div>

        <h6>
            <VCIcon name="fa6-solid:vihara" /> Connection
        </h6>
        <AIdentityProviderLdapConnectionFields :entity="data" />

        <div class="row">
            <div class="col">
                <h6>
                    <VCIcon name="fa6-solid:user" /> User
                </h6>
                <AIdentityProviderLdapUserFields :entity="data" />
            </div>
            <div class="col">
                <h6>
                    <VCIcon name="fa6-solid:masks-theater" /> Group
                </h6>
                <AIdentityProviderLdapGroupFields :entity="data" />
            </div>
        </div>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="isInvalid"
            @submit="submit"
        />
    </form>
</template>
