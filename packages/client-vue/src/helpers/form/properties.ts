/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function initFormAttributesFromSource(
    form: Record<string, any>,
    source?: Record<string, any>,
) : void {
    if (!source) {
        return;
    }

    const keys = Object.keys(form);
    for (let i = 0; i < keys.length; i++) {
        if (Object.prototype.hasOwnProperty.call(source, keys[i])) {
            form[keys[i]] = source[keys[i]] ?? '';
        }
    }
}
