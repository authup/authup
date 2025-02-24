<script lang="ts">
import { IdentityProviderPreset, IdentityProviderProtocol } from '@authup/core-kit';
import { defineComponent } from 'vue';
import { AIdentityProviderPreset } from './AIdentityProviderPreset';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';

export default defineComponent({
    components: {
        AIdentityProviderPreset,
        AIdentityProviderProtocol,
    },
    props: {
        protocol: {
            type: String,
        },
        preset: {
            type: String,
        },
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

        return {
            protocols,
            presets,
            pickProtocol,
            pickPreset,
        };
    },
});
</script>
<template>
    <div class="d-flex flex-column gap-2">
        <div>
            <h6>Protocols</h6>

            <div class="d-flex flex-row gap-2 flex-wrap">
                <template
                    v-for="(item, key) in protocols"
                    :key="key"
                >
                    <AIdentityProviderProtocol :id="item">
                        <template #default="props">
                            <div
                                :class="{'active': item === protocol && !preset}"
                                class="d-flex flex-column gap-1 text-center identity-provider-picker-item"
                                @click.prevent="pickProtocol(item)"
                            >
                                <div>
                                    <i
                                        class="fa-2x"
                                        :class="props.icon"
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
            <h6>Presets</h6>

            <div class="d-flex flex-row gap-2 flex-wrap">
                <template
                    v-for="(item, key) in presets"
                    :key="key"
                >
                    <AIdentityProviderPreset :id="item">
                        <template #default="props">
                            <div
                                :class="{'active': item === preset}"
                                class="d-flex flex-column gap-1 text-center identity-provider-picker-item"
                                @click.prevent="pickPreset(item)"
                            >
                                <div>
                                    <i
                                        class="fa-2x"
                                        :class="props.icon"
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
<style scoped>
.identity-provider-picker-item {
    cursor: pointer;
    border-radius: 4px;
    min-width: 120px;
    color: #5b646c;
    background-color: #ececec;
    padding: 0.5rem;
}

.identity-provider-picker-item.active,
.identity-provider-picker-item:hover,
.identity-provider-picker-item:active {
    background-color: #6d7fcc;
    color: #fff;
}
</style>
