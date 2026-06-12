<script lang="ts">
import { IdentityProviderPreset, IdentityProviderProtocol } from '@authup/core-kit';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { defineComponent } from 'vue';
import { useTranslations } from '../../../core';
import { AIdentityProviderPreset } from './AIdentityProviderPreset';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';

export default defineComponent({
    components: {
        AIdentityProviderPreset,
        AIdentityProviderProtocol,
    },
    props: {
        protocol: { type: String },
        preset: { type: String },
    },
    emits: ['pick'],
    setup(props, setup) {
        const protocols = Object.values(IdentityProviderProtocol);
        const presets = Object.values(IdentityProviderPreset);

        const pickProtocol = (protocol: string) => {
            setup.emit('pick', 'protocol', protocol);
        };

        const pickPreset = (preset: string) => {
            setup.emit('pick', 'preset', preset);
        };

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PROTOCOLS,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PRESETS,
            },
        ]);

        return {
            protocols,
            presets,
            translations,
            pickProtocol,
            pickPreset,
        };
    },
});
</script>
<template>
    <div class="flex flex-col gap-2">
        <div>
            <h6>{{ translations.protocols }}</h6>

            <div class="flex flex-row gap-2 flex-wrap">
                <template
                    v-for="(item, key) in protocols"
                    :key="key"
                >
                    <AIdentityProviderProtocol :id="item">
                        <template #default="props">
                            <div
                                :class="{'active': item === protocol && !preset}"
                                class="flex flex-col gap-1 text-center a-picker-item"
                                @click.prevent="pickProtocol(item)"
                            >
                                <div>
                                    <VCIcon
                                        class="text-2xl"
                                        :name="props.icon"
                                    />
                                </div>
                                <div>
                                    {{ props.name }}
                                </div>
                            </div>
                        </template>
                    </AIdentityProviderProtocol>
                </template>
            </div>
        </div>
        <div>
            <h6>{{ translations.presets }}</h6>

            <div class="flex flex-row gap-2 flex-wrap">
                <template
                    v-for="(item, key) in presets"
                    :key="key"
                >
                    <AIdentityProviderPreset :id="item">
                        <template #default="props">
                            <div
                                :class="{'active': item === preset}"
                                class="flex flex-col gap-1 text-center a-picker-item"
                                @click.prevent="pickPreset(item)"
                            >
                                <div>
                                    <VCIcon
                                        class="text-2xl"
                                        :name="props.icon"
                                    />
                                </div>
                                <div>
                                    {{ props.name }}
                                </div>
                            </div>
                        </template>
                    </AIdentityProviderPreset>
                </template>
            </div>
        </div>
    </div>
</template>
