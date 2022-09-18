/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function initFormAttributesFromEntity(form: Record<string, any>, entity?: Record<string, any>) {
    if (!entity) {
        return entity;
    }

    const keys = Object.keys(form);
    for (let i = 0; i < keys.length; i++) {
        if (Object.prototype.hasOwnProperty.call(entity, keys[i])) {
            form[keys[i]] = entity[keys[i]];
        }
    }

    return entity;
}
