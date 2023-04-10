/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Role } from '@authup/core';
import { SlotName } from '@vue-layout/list-controls';
import { IdentityProviderRoleAssignmentListItem } from './IdentityProviderRoleAssignmentListItem';
import { RoleList } from '../role';

export const IdentityProviderRoleAssignmentList = defineComponent({
    name: 'OAuth2ProviderRoleAssignmentList',
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        return () => h(RoleList, {
            withHeader: false,
        }, {
            [SlotName.ITEMS]: (slotProps: { data: Role[] }) => slotProps.data.map((item: Role) => h(
                IdentityProviderRoleAssignmentListItem,
                {
                    key: item.id,
                    entityId: props.entityId,
                    role: item,
                },
            )),
        });
    },
});

export default IdentityProviderRoleAssignmentList;
