/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { ClientEntity } from './entity.ts';

export class ClientRepository extends Repository<ClientEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(ClientEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }
}
