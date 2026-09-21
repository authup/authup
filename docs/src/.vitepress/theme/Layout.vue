<template>
    <DefaultLayout>
        <template #layout-bottom>
            <Footer />
        </template>
    </DefaultLayout>
</template>

<script lang="ts">
import DefaultTheme from 'vitepress/theme';
import { defineComponent } from 'vue';
import Footer from './components/Footer.vue';

export default defineComponent({
    name: 'AuthupLayout',
    components: {
        DefaultLayout: DefaultTheme.Layout,
        Footer,
    },
});
</script>
