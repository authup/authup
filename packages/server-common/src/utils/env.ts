/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/common';
import process from 'node:process';

export function hasProcessEnv(key: string) : boolean {
    return hasOwnProperty(process.env, key);
}

export function readFromProcessEnv(key: string) : string | undefined;
export function readFromProcessEnv<T>(key: string, alt: T) : T | string;
export function readFromProcessEnv<T>(key: string, alt?: T): any {
    if (hasOwnProperty(process.env, key)) {
        return process.env[key];
    }

    return alt;
}

export function readBoolFromProcessEnv(key: string, alt?: boolean): boolean | undefined {
    const value = readFromProcessEnv(key, alt);

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

export function readIntFromProcessEnv(key: string, alt?: number): number | undefined {
    const value = readFromProcessEnv(key, alt);
    const intValue = parseInt(`${value}`, 10);

    if (Number.isNaN(intValue)) {
        return alt;
    }

    return intValue;
}
