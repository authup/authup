/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { Role } from '@authelion/common';
import { SlotName } from '@vue-layout/utils';
import {
    RobotRoleAssignmentListItemActions,
    RobotRoleListItemActionsProperties,
} from '../robot-role/RobotRoleAssignmentListItemActions';
import { RobotList } from '../robot';

export type Properties = {
    [key: string]: any;

    entityId: string
};

export const RoleRobotAssignmentList = Vue.extend<any, any, any, Properties>({
    name: 'RoleRobotAssignmentList',
    props: {
        entityId: String,
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const buildProps = (item: Role) : RobotRoleListItemActionsProperties => ({
            roleId: vm.entityId,
            robotId: item.id,
        });

        return h(RobotList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(RobotRoleAssignmentListItemActions, {
                    props: buildProps(slotProps.item),
                }),
            },
        });
    },
});

export default RoleRobotAssignmentList;
