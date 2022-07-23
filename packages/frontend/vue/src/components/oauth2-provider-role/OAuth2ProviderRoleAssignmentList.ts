/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { Role } from '@authelion/common';
import { SlotName } from '@vue-layout/utils';
import { OAuth2ProviderRoleAssignmentListItem, OAuth2ProviderRoleListItemProperties } from './OAuth2ProviderRoleAssignmentListItem';
import { RoleList } from '../role';

type OAuth2ProviderRoleListProperties = {
    [key: string]: any;

    entityId: string
};

export const OAuth2ProviderRoleAssignmentList = Vue.extend<
any,
any,
any,
OAuth2ProviderRoleListProperties
>({
    name: 'OAuth2ProviderRoleAssignmentList',
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const buildProps = (item: Role) : OAuth2ProviderRoleListItemProperties => ({
            entityId: vm.entityId,
            role: item,
        });

        return h(RoleList, {
            props: {
                withHeader: false,
            },
            scopedSlots: {
                [SlotName.ITEMS]: (slotProps) => slotProps.items.map((item: Role) => h(OAuth2ProviderRoleAssignmentListItem, {
                    key: item.id,
                    props: buildProps(item),
                })),
            },
        });
    },
});

export default OAuth2ProviderRoleAssignmentList;
