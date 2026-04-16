/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
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

export const APolicyTypeBadge = defineComponent({
    props: {
        type: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        return () => h('span', { class: 'badge bg-info' }, typeLabels[props.type] || props.type);
    },
});
