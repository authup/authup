<!--
  - Copyright (c) 2022-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    nextTick,
    reactive,
    ref,
} from 'vue';
import type {
    IdentityProvider,
    IdentityProviderPreset,
} from '@authup/core-kit';
import { EntityType, IdentityProviderProtocol } from '@authup/core-kit';
import { VCFormGroup, VCFormInput } from '@vuecs/forms';
import {
    extractValidupResultsFromChild,
    injectHTTPClient,
} from '../../../core';
import { onChange, useIsEditing } from '../../../composables';
import {
    AFormSubmit,
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';
import { AIdentityProviderBasicFields } from './AIdentityProviderBasicFields.vue';
import { AIdentityProviderOAuth2ClientFields } from './AIdentityProviderOAuth2ClientFields.vue';
import AIdentityProviderOAuth2EndpointFields from './AIdentityProviderOAuth2EndpointFields.vue';
import { AIdentityProviderPreset } from './AIdentityProviderPreset';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';

export const AIdentityProviderOAuth2Form = defineComponent({
    components: {
        AFormSubmit,
        AIdentityProviderBasicFields,
        AIdentityProviderOAuth2ClientFields,
        AIdentityProviderOAuth2EndpointFields,
        AIdentityProviderPreset,
        AIdentityProviderProtocol,
        VCFormGroup,
        VCFormInput,
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
        protocol: {
            type: String as PropType<string | null>,
            default: IdentityProviderProtocol.OAUTH2,
        },
        preset: { type: String as PropType<string | null> },
    },
    emits: defineEntityVEmitOptions<IdentityProvider>(),
    setup(props, ctx) {
        const apiClient = injectHTTPClient();
        const manager = defineEntityManager({
            type: `${EntityType.IDENTITY_PROVIDER}`,
            setup: ctx,
            props,
        });

        const protocolEff = computed(() => {
            if (manager.data.value) return manager.data.value.protocol;
            return props.protocol;
        });

        const presetEff = computed(() => {
            if (manager.data.value) return manager.data.value.preset;
            return props.preset;
        });

        const busy = ref(false);
        // Parent collector — see APolicyForm for the same pattern.
        const $v = useValidup(new Container(), reactive({}), { stopPropagation: true });
        const isEditing = useIsEditing(manager.data);

        const isInvalid = computed(() => {
            const basic = $v.$getResultsForChild('basic');
            const client = $v.$getResultsForChild('client');
            const endpoint = $v.$getResultsForChild('endpoint');
            return !!basic?.$invalid.value
                || !!client?.$invalid.value
                || !!endpoint?.$invalid.value;
        });

        const authorizeUri = computed<string>(() => {
            if (!manager.data.value) return '';
            return apiClient.identityProvider.getAuthorizeUri(manager.data.value.id);
        });

        const basicFieldsRef = ref<{ assign: (data: Record<string, unknown>) => void } | null>(null);

        onChange(presetEff, () => {
            if (!basicFieldsRef.value) return;

            if (presetEff.value) {
                basicFieldsRef.value.assign({
                    name: presetEff.value,
                    slug: presetEff.value,
                });
                return;
            }

            basicFieldsRef.value.assign({ name: '', slug: '' });
        });

        function initForm() {
            nextTick(() => {
                if (
                    !manager.data.value &&
                    presetEff.value &&
                    basicFieldsRef.value
                ) {
                    basicFieldsRef.value.assign({
                        name: presetEff.value,
                        slug: presetEff.value,
                    });
                }
            });
        }

        initForm();

        const submit = async () => {
            if (isInvalid.value) return;

            const data: Partial<IdentityProvider> = {
                ...extractValidupResultsFromChild($v, 'basic'),
                ...extractValidupResultsFromChild($v, 'client'),
                ...extractValidupResultsFromChild($v, 'endpoint'),
            };

            if (protocolEff.value) {
                data.protocol = protocolEff.value as IdentityProviderProtocol;
            }

            if (presetEff.value) {
                data.preset = presetEff.value as IdentityProviderPreset;
            }

            await manager.createOrUpdate(data);
        };

        const oidcEnabled = computed(() => protocolEff.value === IdentityProviderProtocol.OIDC);

        return {
            data: manager.data,
            busy,
            isEditing,
            isInvalid,
            protocolEff,
            presetEff,
            authorizeUri,
            basicFieldsRef,
            oidcEnabled,
            submit,
        };
    },
});

export default AIdentityProviderOAuth2Form;
</script>

<template>
    <form @submit.prevent="submit">
        <template v-if="!data">
            <AIdentityProviderPreset
                v-if="presetEff"
                :id="presetEff"
                :key="presetEff"
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
            </AIdentityProviderPreset>
            <AIdentityProviderProtocol
                v-else-if="protocolEff"
                :id="protocolEff"
                :key="protocolEff"
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
        </template>

        <template v-if="isEditing">
            <h6>
                <VCIcon name="fa6-solid:circle-info" /> Details
            </h6>
            <VCFormGroup>
                <template #label>
                    Redirect URL
                </template>
                <VCFormInput
                    :model-value="authorizeUri"
                    :disabled="true"
                />
            </VCFormGroup>
        </template>

        <div class="row">
            <div class="col">
                <h6>
                    <VCIcon name="fa6-solid:wrench" /> Basic
                </h6>
                <AIdentityProviderBasicFields
                    ref="basicFieldsRef"
                    :entity="data"
                />
            </div>
            <div class="col">
                <h6>
                    <VCIcon name="fa6-solid:lock" /> Security
                </h6>
                <AIdentityProviderOAuth2ClientFields :entity="data" />
            </div>
        </div>

        <template v-if="!presetEff">
            <h6>
                <VCIcon name="fa6-solid:vihara" /> Endpoints
            </h6>
            <AIdentityProviderOAuth2EndpointFields
                :entity="data"
                :discovery="oidcEnabled"
            />
        </template>

        <AFormSubmit
            :is-busy="busy"
            :is-editing="isEditing"
            :is-invalid="isInvalid"
            @submit="submit"
        />
    </form>
</template>
