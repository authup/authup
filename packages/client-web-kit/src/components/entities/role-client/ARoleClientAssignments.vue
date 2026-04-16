<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { AClients } from '../client';
import { AClientRoleAssignment } from '../client-role';

export default defineComponent({
    components: { AClients, AClientRoleAssignment },
    props: { entityId: String },
});
</script>
<template>
    <AClients>
        <template #itemActions="{ data }">
            <AClientRoleAssignment
                :key="data.id"
                :role-id="entityId"
                :client-id="data.id"
            />
        </template>
    </AClients>
</template>
