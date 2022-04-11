/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSourceOptions } from 'typeorm';

export function setSubscribersForConnectionOptions<T extends DataSourceOptions>(
    options: T,
    merge?: boolean,
) : T {
    options = {
        ...options,
        subscribers: [
            ...(merge && options.subscribers ? options.subscribers : []) as string[],
        ],
    };

    return options;
}
