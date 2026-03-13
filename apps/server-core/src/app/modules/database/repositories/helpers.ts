/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { In, IsNull } from 'typeorm';

export function translateWhereConditions(where: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(where).forEach(([key, value]) => {
        if (value === null) {
            result[key] = IsNull();
        } else if (Array.isArray(value)) {
            result[key] = In(value);
        } else {
            result[key] = value;
        }
    });
    return result;
}
