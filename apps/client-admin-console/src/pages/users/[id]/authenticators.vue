<script lang="ts">
import type { User } from '@authup/core-kit';
import { AUserAuthenticators } from '@authup/client-web-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { useErrorToast } from '../../../composables/error';

export default defineComponent({
    components: { AUserAuthenticators },
    props: {
        entity: {
            type: Object as PropType<User>,
            required: true,
        },
    },
    setup(props) {
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        return {
            userId: props.entity.id,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <AUserAuthenticators
            :user-id="userId"
            @failed="handleFailed"
        />
    </div>
</template>
