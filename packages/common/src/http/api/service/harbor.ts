/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { APIConfig, APIServiceHarborConfig, APIType } from '../config';
import { BaseAPI } from '../module';
import { ApiRequestConfig } from '../type';
import { APIServiceError } from './error';

export function parseHarborConnectionString(connectionString: string) : APIServiceHarborConfig {
    const parts : string[] = connectionString.split('@');
    if (parts.length !== 2) {
        throw new APIServiceError('Harbor connection string must be in the following format: user:password@host');
    }

    const host : string = parts[1];

    const authParts : string[] = parts[0].split(':');
    if (authParts.length !== 2) {
        throw new APIServiceError('Harbor connection string must be in the following format: user:password@host');
    }

    return {
        host,
        user: authParts[0],
        password: authParts[1],
    };
}

export class HarborAPI extends BaseAPI {
    constructor(config: APIConfig<APIType.HARBOR>) {
        const harborConfig : APIServiceHarborConfig = config.connection ?? parseHarborConnectionString(config.connectionString);

        const driverConfig : ApiRequestConfig = {
            ...(config.driver ?? {}),
            baseURL: harborConfig.host,
        };

        super(driverConfig);

        this.setAuthorizationHeader({
            type: 'Basic',
            username: harborConfig.user,
            password: harborConfig.password,
        });
    }
}
