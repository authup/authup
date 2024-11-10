/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function makeURLPublicAccessible(url: string) {
    return url.replace('0.0.0.0', '127.0.0.1');
}
