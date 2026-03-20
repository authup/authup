/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

type PickRecord<T extends Record<string, any>, S extends keyof T> = {
    [K in S]: K extends keyof T ? T[K] : never
};

export function pickRecord<
    T extends Record<string, any>,
    K extends keyof T,
>(data: T, keys: K[]) : PickRecord<T, K> {
    const output : PickRecord<T, K> = {} as PickRecord<T, K>;
    for (const key of keys) {
        output[key] = data[key];
    }

    return output;
}

type OmitRecord<T extends Record<string, any>, S extends keyof T> = {
    [K in Exclude<keyof T, S>]: T[K]
};

export function omitRecord<
    T extends Record<string, any>,
    K extends keyof T,
>(data: T, keys: K[]) : OmitRecord<T, K> {
    const dataKeys = Object.keys(data) as K[];

    let index : number;
    const output = {} as OmitRecord<T, K>;
    for (const dataKey of dataKeys) {
        index = keys.indexOf(dataKey);
        if (index !== -1) {
            continue;
        }

        output[dataKey as unknown as keyof OmitRecord<T, K>] = data[dataKey] as unknown as T[Exclude<keyof T, K>];
    }

    return output;
}
