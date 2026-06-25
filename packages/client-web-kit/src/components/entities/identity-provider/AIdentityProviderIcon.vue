<!--
  Copyright (c) 2023.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { IdentityProvider } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { VCIcon } from '@vuecs/icon';
import { AIdentityProviderPreset } from './AIdentityProviderPreset';
import { AIdentityProviderProtocol } from './AIdentityProviderProtocol';

export default defineComponent({
    components: {
        AIdentityProviderPreset, 
        AIdentityProviderProtocol, 
        VCIcon, 
    },
    inheritAttrs: false,
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: true,
        },
    },
});
</script>
<template>
    <AIdentityProviderPreset
        v-if="entity.preset"
        :id="entity.preset"
    >
        <template #default="item">
            <VCIcon
                :name="item.icon"
                :class="$attrs.class"
            />
        </template>
    </AIdentityProviderPreset>
    <AIdentityProviderProtocol
        v-else-if="entity.protocol"
        :id="entity.protocol"
    >
        <template #default="item">
            <VCIcon
                :name="item.icon"
                :class="$attrs.class"
            />
        </template>
    </AIdentityProviderProtocol>
</template>
