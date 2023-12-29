/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { env } from 'std-env';
import { hasOwnProperty } from './has-own-property';

export function hasProcessEnv(key: string | string[]) : boolean {
    const keys = Array.isArray(key) ? key : [key];
    for (let i = 0; i < keys.length; i++) {
        if (hasOwnProperty(env, keys[i])) {
            return true;
        }
    }
    return false;
}

export function readFromProcessEnv() : string[];
export function readFromProcessEnv(key: string | string[]) : string | undefined;
export function readFromProcessEnv<T>(key: string | string[], alt: T) : T | string;
export function readFromProcessEnv<T>(key?: string | string[], alt?: T): any {
    if (typeof key === 'undefined') {
        return env;
    }

    const keys = Array.isArray(key) ? key : [key];

    for (let i = 0; i < keys.length; i++) {
        if (hasOwnProperty(env, keys[i])) {
            return env[keys[i]];
        }
    }

    return alt;
}

export function readBoolFromProcessEnv(key: string | string[], alt?: boolean): boolean | undefined {
    const keys = Array.isArray(key) ? key : [key];
    for (let i = 0; i < keys.length; i++) {
        const value = readFromProcessEnv(keys[i], alt);

        switch (value) {
            case true:
            case 'true':
            case 't':
            case '1':
                return true;
            case false:
            case 'false':
            case 'f':
            case '0':
                return false;
        }
    }

    return alt;
}

export function readBoolOrStringFromProcessEnv(
    key: string,
    alt?: boolean | string,
) : boolean | string | undefined {
    if (hasProcessEnv(key)) {
        const value = readBoolFromProcessEnv(key, undefined);
        if (typeof value === 'undefined') {
            return readFromProcessEnv(key, alt);
        }

        return value;
    }

    return alt;
}

export function readIntFromProcessEnv(
    key: string | string[],
    alt: number
) : number;

export function readIntFromProcessEnv(
    key: string | string[],
    alt?: number,
): number | undefined;

export function readIntFromProcessEnv(
    key: string | string[],
    alt?: number,
): number | undefined {
    const keys = Array.isArray(key) ? key : [key];

    for (let i = 0; i < keys.length; i++) {
        const value = readFromProcessEnv(keys[i], alt);
        const intValue = parseInt(`${value}`, 10);

        if (!Number.isNaN(intValue)) {
            return intValue;
        }
    }

    return alt;
}
