/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import { defineComponent } from 'vue';
import type { ClientScope } from '@authup/core-kit';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
    renderToggleButton,
} from '../../utility';

export const AClientScopeAssignment = defineComponent({
    props: {
        clientId: String,
        scopeId: String,
    },
    emits: defineEntityVEmitOptions<ClientScope>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.CLIENT_SCOPE}`,
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

        return () => renderToggleButton({
            changed: (value) => {
                if (value) {
                    return manager.create({
                        client_id: props.clientId,
                        scope_id: props.scopeId,
                    });
                }

                return manager.delete();
            },
            value: !!manager.data.value,
            isBusy: manager.busy.value,
        });
    },
});
