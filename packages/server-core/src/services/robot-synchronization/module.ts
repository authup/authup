/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';
import type { VaultClient } from '@authup/server-kit';
import { isClientErrorWithStatusCode } from 'hapic';

export class RobotSynchronizationService {
    protected instance : VaultClient;

    constructor(instance: VaultClient) {
        this.instance = instance;
    }

    protected async createEngine() {
        try {
            await this.instance.mount.create(
                'robots',
                {
                    type: 'kv',
                    options: {
                        version: 1,
                    },
                },
            );
        } catch (e) {
            if (isClientErrorWithStatusCode(e, 404)) {
                return;
            }

            throw e;
        }
    }

    async save(entity: Pick<Robot, 'id' | 'secret' | 'name'>) {
        try {
            // todo: maybe also save by id :/

            await this.instance.keyValueV1.create(
                'robots',
                entity.name.toLowerCase(),
                {
                    id: entity.id,
                    secret: entity.secret,
                },
            );
        } catch (e) {
            if (isClientErrorWithStatusCode(e, 404)) {
                await this.createEngine();
                await this.save(entity);
                return;
            }

            throw e;
        }
    }

    async remove(entity: Pick<Robot, 'name'>) {
        try {
            await this.instance.keyValueV1.delete(
                'robots',
                entity.name.toLowerCase(),
            );
        } catch (e) {
            if (isClientErrorWithStatusCode(e, 404)) {
                return;
            }

            throw e;
        }
    }

    async find(entity: Pick<Robot, 'name'>) {
        try {
            const response = await this.instance.keyValueV1.getOne(
                'robots',
                entity.name.toLowerCase(),
            );
            if (response && response.data) {
                return response.data as Robot;
            }

            return undefined;
        } catch (e) {
            if (isClientErrorWithStatusCode(e, 404)) {
                return undefined;
            }

            throw e;
        }
    }
}
