/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import {
    defineComponent,
} from 'vue';
import type { ClientRole } from '@authup/core-kit';
import {
    createResourceManager,
    defineResourceVEmitOptions,
    renderToggleButton,
} from '../utility';

export const AClientRoleAssignment = defineComponent({
    props: {
        roleId: String,
        clientId: String,
    },
    emits: defineResourceVEmitOptions<ClientRole>(),
    async setup(props, setup) {
        const manager = createResourceManager({
            type: `${ResourceType.CLIENT_ROLE}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.client_id === props.clientId &&
                        event.data.role_id === props.roleId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    client_id: props.clientId,
                    role_id: props.roleId,
                },
            },
        });

        return () => renderToggleButton({
            changed: (value) => {
                if (value) {
                    return manager.create({
                        client_id: props.clientId,
                        role_id: props.roleId,
                    });
                }

                return manager.delete();
            },
            value: !!manager.data.value,
            isBusy: manager.busy.value,
        });
    },
});

export default AClientRoleAssignment;
