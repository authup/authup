/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import { Role } from '@authelion/common';
import { SlotName } from '@vue-layout/hyperscript';
import { OAuth2ProviderRoleAssignmentListItem } from './OAuth2ProviderRoleAssignmentListItem';
import { RoleList } from '../role';

export const OAuth2ProviderRoleAssignmentList = defineComponent({
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
                OAuth2ProviderRoleAssignmentListItem,
                {
                    key: item.id,
                    entityId: props.entityId,
                    role: item,
                },
            )),
        });
    },
});

export default OAuth2ProviderRoleAssignmentList;
