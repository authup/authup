/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { APIConfig } from './type';

const configMap: Map<string, APIConfig<any>> = new Map<string, APIConfig<any>>();

export function setAPIConfig(
    key: string,
    value: APIConfig<any>,
) {
    configMap.set(key, value);

    return value;
}

export function getAPIConfig(
    key: string,
): APIConfig<any> {
    const data: APIConfig<any> | undefined = configMap.get(key);
    if (typeof data === 'undefined') {
        return {};
    }

    return data;
}
