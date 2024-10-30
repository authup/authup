/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import { defineComponent } from 'vue';
import type { ClientScope } from '@authup/core-kit';
import {
    createResourceManager,
    defineEntityManagerEvents,
    renderEntityAssignAction,
} from '../../core';

export const AClientScopeAssignment = defineComponent({
    props: {
        clientId: String,
        scopeId: String,
    },
    emits: defineEntityManagerEvents<ClientScope>(),
    async setup(props, setup) {
        const manager = createResourceManager({
            type: `${DomainType.CLIENT_SCOPE}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.client_id === props.clientId &&
                        event.data.scope_id === props.scopeId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    client_id: props.clientId,
                    scope_id: props.scopeId,
                },
            },
        });

        return () => renderEntityAssignAction({
            add: () => manager.create({
                client_id: props.clientId,
                scope_id: props.scopeId,
            }),
            drop: manager.delete,
            item: manager.data,
            busy: manager.busy,
        });
    },
});
