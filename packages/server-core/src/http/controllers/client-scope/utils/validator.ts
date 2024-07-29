/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type {
    ClientScopeEntity,
} from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class ClientScopeRequestValidator extends Container<ClientScopeEntity> {
    constructor(options: ContainerOptions<ClientScopeEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount(
            'client_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .isUUID()),
        );

        this.mount(
            'scope_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .isUUID()),
        );
    }
}
