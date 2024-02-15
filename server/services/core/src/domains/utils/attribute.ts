/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

type BaseAttribute = {
    name: string,
    value: string,
    [key: string]: any
};

export function transformAttributesToRecord(data: BaseAttribute[]) : Record<string, any> {
    const attributes : Record<string, any> = {};

    for (let i = 0; i < data.length; i++) {
        attributes[data[i].name] = data[i].value;
    }

    return attributes;
}

export function transformAttributesToEntities<T extends BaseAttribute>(
    data: Record<string, any>,
    extra?: Partial<T>,
) : T[] {
    const entities : BaseAttribute[] = [];

    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
        entities.push({
            ...(extra || {}),
            name: keys[i],
            value: data[keys[i]],
        });
    }

    return entities as T[];
}

export function appendAttributes<T extends Record<string, any>>(entity: Partial<T>, attributes: Partial<T>) : T {
    const keys : (keyof T)[] = Object.keys(attributes);
    for (let i = 0; i < keys.length; i++) {
        entity[keys[i]] = attributes[keys[i]];
    }

    return entity as T;
}
