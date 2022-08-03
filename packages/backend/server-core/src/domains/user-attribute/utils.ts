/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserAttribute } from '@authelion/common';

export function transformUserAttributes(data: UserAttribute[]) : Record<string, any> {
    const attributes : Record<string, any> = {};

    for (let i = 0; i < data.length; i++) {
        attributes[data[i].name] = data[i].value;
    }

    return attributes;
}
