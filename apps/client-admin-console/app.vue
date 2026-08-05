<script>
import { defineNuxtComponent, useHead } from '#app';

export default defineNuxtComponent({
    setup() {
        useHead({
            charset: 'utf-8',
            titleTemplate: 'Authup - Authentication & Authorization Framework',
            meta: [
                {
                    name: 'description',
                    content: 'Authup is an authentication & authorization framework. ' +
                        'It is designed to be easy to use and flexible, with support for multiple authentication strategies.' +
                        ' With Authup, developers can quickly ' +
                        'and easily add authentication & authorization to their applications.',
                },
            ],
            link: [],
        });
    },
});
</script>
<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
</template>
