/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributesPolicy } from './types';

export function defineAttributesPolicy<
    T extends Record<string, any> = Record<string, any>,
>(
    data: AttributesPolicy<T>,
) : AttributesPolicy<T> {
    return data;
}
