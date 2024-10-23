<script lang="ts">
import { defineNuxtComponent, definePageMeta, h } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });
    },
});
</script>
<template>
    <div />
</template>
