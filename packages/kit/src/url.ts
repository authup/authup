/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function makeURLPublicAccessible(url: string) {
    return url.replace('0.0.0.0', '127.0.0.1');
}

export function getURLBasePath(url?: string) : string {
    if (!url) {
        return '';
    }

    let pathname : string;
    try {
        pathname = new URL(url).pathname;
    } catch {
        return '';
    }

    const normalized = pathname.replace(/\/+$/, '');
    if (normalized === '' || normalized === '/') {
        return '';
    }

    return normalized;
}
