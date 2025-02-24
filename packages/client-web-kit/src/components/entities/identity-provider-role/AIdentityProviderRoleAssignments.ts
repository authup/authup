/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Role } from '@authup/core-kit';
import type { ListBodySlotProps } from '@vuecs/list-controls';
import { SlotName } from '@vuecs/list-controls';
import { AIdentityProviderRoleAssignment } from './AIdentityProviderRoleAssignment';
import { ARoles } from '../role';

export const AIdentityProviderRoleAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(ARoles, {
            headerTitle: false,
        }, {
            [SlotName.BODY]: (slotProps: ListBodySlotProps<Role>) => slotProps.data.map((item: Role) => h(
                AIdentityProviderRoleAssignment,
                {
                    key: item.id,
                    entityId: props.entityId,
                    role: item,
                },
            )),
            ...slots,
        });
    },
});

export default AIdentityProviderRoleAssignments;
