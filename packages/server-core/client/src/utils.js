/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';

export function getWindowApp() {
    if (
        typeof window !== 'undefined' &&
        isObject(window) &&
        isObject(window.hydrationData)
    ) {
        return window.hydrationData;
    }

    return {};
}
