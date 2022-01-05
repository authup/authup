/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    APIConfig,
    APIConfigType, APIType, API_CONFIG_DEFAULT_KEY,
    getAPIConfig,
} from './config';
import { BaseAPI } from './module';
import { HarborAPI, VaultAPI } from './service';

const instanceMap: Record<string, BaseAPI> = {};

export type APIReturnType<T extends APIConfigType> =
    T extends APIType.HARBOR ? HarborAPI :
        T extends APIType.VAULT ? VaultAPI :
            BaseAPI;

export function useAPI<T extends APIType>(
    key?: string,
) : APIReturnType<T> {
    key ??= API_CONFIG_DEFAULT_KEY;

    const config : APIConfig<T> = getAPIConfig(key);

    if (Object.prototype.hasOwnProperty.call(instanceMap, key)) {
        return instanceMap[key] as APIReturnType<T>;
    }

    let instance : BaseAPI;

    switch (config.type) {
        case 'harbor':
            instance = new HarborAPI(config as APIConfig<APIType.HARBOR>);
            break;
        case 'vault':
            instance = new VaultAPI(config as APIConfig<APIType.VAULT>);
            break;
        default:
            instance = new BaseAPI(config.driver);
            break;
    }

    instanceMap[key] = instance;

    return instance as APIReturnType<T>;
}
