/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RequestDatabaseValidator } from '../../../../core';
import {
    ClientScopeEntity,
} from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class ClientScopeRequestValidator extends RequestDatabaseValidator<ClientScopeEntity> {
    constructor() {
        super(ClientScopeEntity);

        this.mount();
    }

    mount() {
        this.addTo(RequestHandlerOperation.CREATE, 'client_id')
            .exists()
            .isUUID();

        this.addTo(RequestHandlerOperation.CREATE, 'scope_id')
            .exists()
            .isUUID();
    }
}
