<script lang="ts">
import { defineComponent } from 'vue';
import { definePageMeta } from '#imports';
import DomainEntityNav from '../../components/DomainEntityNav';
import AccountSVG from '../../components/svg/AccountSVG';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    components: {
        DomainEntityNav,
        AccountSVG, 
    },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const items = [
            {
                name: 'Account',
                icon: 'fa6-solid:bars',
                urlSuffix: '',
            },
            {
                name: 'Security',
                icon: 'fa6-solid:lock',
                urlSuffix: '/security',
            },
        ];

        return { items };
    },
});
</script>
<template>
    <div>
        <div class="text-center">
            <AccountSVG />
        </div>
        <h1 class="title no-border mb-3">
            <VCIcon name="fa6-solid:gear" />
            Settings
            <span class="sub-title ms-1">
                Management
            </span>
        </h1>
        <div class="content-wrapper">
            <div class="content-sidebar flex-col">
                <DomainEntityNav
                    :items="items"
                    path="/settings"
                    direction="vertical"
                />
            </div>
            <div class="content-container">
                <NuxtPage />
            </div>
        </div>
    </div>
</template>
