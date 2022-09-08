/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function removePrefixFromConfigKey(key: string, prefix: string) {
    if (!key.startsWith(prefix)) {
        return key;
    }

    let targetKey = key.substring(prefix.length - 1);
    targetKey = targetKey.charAt(0).toLowerCase() + targetKey.slice(1);

    return targetKey;
}
