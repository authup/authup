/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { Robot } from '@authelion/common';
import {
    RobotPermissionListItemActions,
    RobotPermissionListItemActionsProperties,
} from '../robot-permission/RobotPermissionListItemActions';
import { PermissionList } from '../permission';
import { SlotName } from '../../constants';
import { RobotList } from '../robot';

export type Properties = {
    entityId: string
};

export const PermissionRobotList = Vue.extend<any, any, any, Properties>({
    name: 'PermissionRobotList',
    components: {
        PermissionList,
        RobotPermissionListItemActions,
    },
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const buildProps = (item: Robot) : RobotPermissionListItemActionsProperties => ({
            permissionId: vm.entityId,
            robotId: item.id,
        });

        return h(RobotList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(RobotPermissionListItemActions, {
                    props: buildProps(slotProps.item),
                }),
            },
        });
    },
});

export default PermissionRobotList;
