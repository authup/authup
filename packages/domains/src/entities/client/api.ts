/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AxiosInstance } from 'axios';
import { Client } from './entity';
import { nullifyEmptyObjectProperties } from '../../utils';
import { SingleResourceResponse } from '../type';

export class ClientAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async executeCommand(
        id: typeof Client.prototype.id,
        command: string,
        data: Record<string, any>,
    ): Promise<SingleResourceResponse<Client>> {
        const { data: resultData } = await this.client
            .post(`clients/${id}/command`, { command, ...data });

        return resultData;
    }

    async create(data: Partial<Client>) {
        const { data: resultData } = await this.client
            .post('clients', nullifyEmptyObjectProperties(data));

        return resultData;
    }
}
