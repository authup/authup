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

// Escape characters that would otherwise let a payload value break out of
// the inline <script> context (`</script>`) or terminate the JS string
// literal via the U+2028/U+2029 line separators. The payload reflects raw
// request input (query params), so this is the XSS boundary — never inline
// unescaped JSON.stringify output into a <script>.
function serializePayload(payload: unknown): string {
    return JSON.stringify(payload)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

export function createWindowPayloadHTML<
    T extends Record<string, any> = Record<string, any>,
>(payload : HydrationPayload<T>) {
    return `
    <script>
    window.__AUTHUP__ = ${serializePayload(payload)};
    </script>
    `;
}
