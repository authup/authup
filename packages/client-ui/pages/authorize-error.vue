<script setup>
import { ref } from 'vue';
import { useRoute } from '#app';

const message = ref('An unknown error occurred.');
const route = useRoute();
if (route.query.message) {
    message.value = route.query.message;
}
</script>
<template>
    <div class="d-flex align-items-center justify-content-center h-100">
        <div class="oauth2-wrapper panel-card p-3 flex-column">
            <div class="text-center">
                <i class="fa-solid fa-exclamation fa-10x text-danger" />
            </div>
            <div class="text-center fs-6 p-3">
                {{ message }}
            </div>
        </div>
    </div>
</template>
