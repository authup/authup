<!--
  - Copyright (c) 2024-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { IdentityProvider } from '@authup/core-kit';
import { EntityType, IdentityProviderProtocol } from '@authup/core-kit';
import {
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { VCIcon } from '@vuecs/icon';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    reactive,
    ref,
} from 'vue';
import { useIsEditing } from '../../../composables';
import { extractValidupResultsFromChild, useTranslations } from '../../../core';
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
        VCIcon,
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
            type: EntityType.IDENTITY_PROVIDER,
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

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.BASIC,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.SECURITY,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.CONNECTION,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.USER,
                count: 1,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.GROUP,
            },
        ]);

        return {
            data: manager.data,
            busy,
            isEditing,
            isInvalid,
            ldapProtocol: IdentityProviderProtocol.LDAP,
            translations,
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

        <div class="flex flex-wrap -mx-2">
            <div class="flex-1 basis-0 px-2">
                <h6>
                    <VCIcon name="fa6-solid:wrench" /> {{ translations.basic }}
                </h6>
                <AIdentityProviderBasicFields :entity="data" />
            </div>
            <div class="flex-1 basis-0 px-2">
                <h6>
                    <VCIcon name="fa6-solid:lock" /> {{ translations.security }}
                </h6>
                <AIdentityProviderLdapCredentialsFields :entity="data" />
            </div>
        </div>

        <h6>
            <VCIcon name="fa6-solid:vihara" /> {{ translations.connection }}
        </h6>
        <AIdentityProviderLdapConnectionFields :entity="data" />

        <div class="flex flex-wrap -mx-2">
            <div class="flex-1 basis-0 px-2">
                <h6>
                    <VCIcon name="fa6-solid:user" /> {{ translations.user }}
                </h6>
                <AIdentityProviderLdapUserFields :entity="data" />
            </div>
            <div class="flex-1 basis-0 px-2">
                <h6>
                    <VCIcon name="fa6-solid:masks-theater" /> {{ translations.group }}
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
