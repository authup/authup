/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '@authup/kit';
import type { HydrationPayload } from './types';

export function getWindowPayload() : HydrationPayload {
    if (
        typeof window !== 'undefined' &&
        isObject(window) &&
        hasOwnProperty(window, '__AUTHUP__') &&
        isObject(window.__AUTHUP__)
    ) {
        return window.__AUTHUP__ as HydrationPayload;
    }

    throw new Error('No hydration data set.');
}

export function createWindowPayloadHTML<
    T extends Record<string, any> = Record<string, any>,
>(payload : HydrationPayload<T>) {
    return `
    <script>
    window.__AUTHUP__ = ${JSON.stringify(payload)};
    </script>
    `;
}
