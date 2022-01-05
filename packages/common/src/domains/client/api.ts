/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from './entity';
import { AuthClientType } from './type';
import { APIType, SingleResourceResponse, useAPI } from '../../http';
import { nullifyEmptyObjectProperties } from '../../utils';

export async function executeAPIClientCommand(
    id: typeof Client.prototype.id,
    command: string,
    data: Record<string, any>,
): Promise<SingleResourceResponse<Client>> {
    const { data: resultData } = await useAPI(APIType.DEFAULT).post(`clients/${id}/command`, { command, ...data });

    return resultData;
}

type AuthClientCreateContext = {
    type: AuthClientType,
    id: string | number
};

export async function addAPIClient(data: AuthClientCreateContext) {
    const { data: resultData } = await useAPI(APIType.DEFAULT)
        .post('clients', nullifyEmptyObjectProperties(data));

    return resultData;
}
