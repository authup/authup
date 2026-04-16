<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { BuiltInPolicyType } from '@authup/access';

const typeLabels: Record<string, string> = {
    [BuiltInPolicyType.COMPOSITE]: 'Composite',
    [BuiltInPolicyType.DATE]: 'Date',
    [BuiltInPolicyType.TIME]: 'Time',
    [BuiltInPolicyType.ATTRIBUTE_NAMES]: 'Attr Names',
    [BuiltInPolicyType.ATTRIBUTES]: 'Attributes',
    [BuiltInPolicyType.REALM_MATCH]: 'Realm Match',
    [BuiltInPolicyType.IDENTITY]: 'Identity',
    [BuiltInPolicyType.PERMISSION_BINDING]: 'Perm Binding',
};

export default defineComponent({
    props: {
        type: {
            type: String,
            required: true,
        },
    },
    setup() {
        return { typeLabels };
    },
});
</script>
<template>
    <span class="badge bg-info">{{ typeLabels[type] || type }}</span>
</template>
