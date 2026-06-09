<!--
  - Copyright (c) 2023-2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    defineComponent,
    ref,
    toRef,
    watch,
} from 'vue';
import { IdentityProviderProtocol, getIdentityProviderProtocolForPreset } from '@authup/core-kit';
import type { IdentityProvider, IdentityProviderPreset } from '@authup/core-kit';
import type { PropType } from 'vue';
import { onChange, useUpdatedAt } from '../../../composables';
import AIdentityProviderLdapForm from './AIdentityProviderLdapForm.vue';
import AIdentityProviderPicker from './AIdentityProviderPicker.vue';
import AIdentityProviderOAuth2Form from './AIdentityProviderOAuth2Form.vue';

export default defineComponent({
    components: {
        AIdentityProviderLdapForm,
        AIdentityProviderOAuth2Form,
        AIdentityProviderPicker,
    },
    props: {
        entity: { type: Object as PropType<IdentityProvider> },
        realmId: { type: String },
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, setup) {
        const protocol = ref<string | null>(null);
        const preset = ref<string | null>(null);

        const entity = toRef(props, 'entity');
        const updatedAt = useUpdatedAt(entity);
        const localEntity = ref<IdentityProvider | undefined>(props.entity);

        // Sync localEntity from the prop. The original implementation used
        // `toRef(props, 'entity')` and mutated it directly on emits; that
        // pattern relies on prop-write side effects which Vue 3 warns about.
        // The explicit `ref + watch` is cleaner but needs the watcher to
        // catch parent-driven updates (e.g. entity loaded after mount).
        watch(() => props.entity, (val) => { localEntity.value = val; });

        const set = () => {
            if (entity.value) {
                if (entity.value.preset) preset.value = entity.value.preset;
                if (entity.value.protocol) protocol.value = entity.value.protocol;
            }
        };

        set();
        onChange(updatedAt, () => set());

        const onPick = (type: 'protocol' | 'preset', value: string) => {
            if (type === 'preset') {
                preset.value = value;
                protocol.value = `${getIdentityProviderProtocolForPreset(value as IdentityProviderPreset)}`;
                return;
            }
            protocol.value = value;
            preset.value = null;
        };

        const onChildCreated = (el: IdentityProvider) => {
            localEntity.value = el;
            setup.emit('created', el);
        };

        const onChildUpdated = (el: IdentityProvider) => {
            localEntity.value = el;
            setup.emit('updated', el);
        };

        const onChildDeleted = (el: IdentityProvider) => {
            localEntity.value = undefined;
            setup.emit('deleted', el);
        };

        const onChildFailed = (err: unknown) => {
            setup.emit('failed', err);
        };

        const isOAuth = (p: string | null) => p === IdentityProviderProtocol.OAUTH2 ||
            p === IdentityProviderProtocol.OIDC;
        const isLdap = (p: string | null) => p === IdentityProviderProtocol.LDAP;

        return {
            protocol,
            preset,
            localEntity,
            isOAuth,
            isLdap,
            onPick,
            onChildCreated,
            onChildUpdated,
            onChildDeleted,
            onChildFailed,
        };
    },
});

</script>

<template>
    <div>
        <AIdentityProviderPicker
            v-if="!localEntity"
            :protocol="protocol ?? undefined"
            :preset="preset ?? undefined"
            @pick="onPick"
        />

        <AIdentityProviderOAuth2Form
            v-if="isOAuth(protocol)"
            :entity="localEntity"
            :realm-id="realmId"
            :protocol="protocol"
            :preset="preset"
            @created="onChildCreated"
            @updated="onChildUpdated"
            @deleted="onChildDeleted"
            @failed="onChildFailed"
        />

        <AIdentityProviderLdapForm
            v-else-if="isLdap(protocol)"
            :entity="localEntity"
            :realm-id="realmId"
            @created="onChildCreated"
            @updated="onChildUpdated"
            @deleted="onChildDeleted"
            @failed="onChildFailed"
        />

        <div
            v-else-if="protocol || preset"
            class="alert alert-warning alert-sm"
        >
            {{ preset ?? protocol }} is not supported yet :/
        </div>
    </div>
</template>
