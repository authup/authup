/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Role } from '@authup/core';
import type { ListBodySlotProps } from '@vue-layout/list-controls';
import { SlotName } from '@vue-layout/list-controls';
import { IdentityProviderRoleAssignAction } from './IdentityProviderRoleAssignAction';
import { RoleList } from '../role';

export const IdentityProviderRoleAssignmentList = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(RoleList, {
            headerTitle: false,
        }, {
            [SlotName.BODY]: (slotProps: ListBodySlotProps<Role>) => slotProps.data.map((item: Role) => h(
                IdentityProviderRoleAssignAction,
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

export default IdentityProviderRoleAssignmentList;
