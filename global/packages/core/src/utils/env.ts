/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { env } from 'std-env';
import { hasOwnProperty } from './has-own-property';

export function hasEnv(key: string | string[]) : boolean {
    const keys = Array.isArray(key) ? key : [key];
    for (let i = 0; i < keys.length; i++) {
        if (hasOwnProperty(env, keys[i])) {
            return true;
        }

        if (hasOwnProperty(globalThis.process?.env, keys[i])) {
            return true;
        }
    }
    return false;
}

export function getEnv() : Record<string, string | undefined>;
export function getEnv(key: string | string[]) : string | undefined;
export function getEnv<T>(key: string | string[], alt: T) : T | string;
export function getEnv<T>(key?: string | string[], alt?: T): any {
    if (typeof key === 'undefined') {
        return env;
    }

    const keys = Array.isArray(key) ? key : [key];

    for (let i = 0; i < keys.length; i++) {
        if (hasOwnProperty(env, keys[i])) {
            return env[keys[i]];
        }

        if (hasOwnProperty(globalThis.process?.env, keys[i])) {
            return globalThis.process?.env[keys[i]];
        }
    }

    return alt;
}

export function getEnvArray(key: string | string[], alt?: string[]): string[] | undefined {
    const data = getEnv(key);
    if (data) {
        return data.split(',');
    }

    return alt;
}

export function getEnvBool(key: string | string[], alt?: boolean): boolean | undefined {
    const keys = Array.isArray(key) ? key : [key];
    for (let i = 0; i < keys.length; i++) {
        const value = getEnv(keys[i], alt);

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

export function getEnvBoolOrString(
    key: string,
    alt?: boolean | string,
) : boolean | string | undefined {
    if (hasEnv(key)) {
        const value = getEnvBool(key, undefined);
        if (typeof value === 'undefined') {
            return getEnv(key, alt);
        }

        return value;
    }

    return alt;
}

export function getEnvInt(
    key: string | string[],
    alt: number
) : number;

export function getEnvInt(
    key: string | string[],
    alt?: number,
): number | undefined;

export function getEnvInt(
    key: string | string[],
    alt?: number,
): number | undefined {
    const keys = Array.isArray(key) ? key : [key];

    for (let i = 0; i < keys.length; i++) {
        const value = getEnv(keys[i], alt);
        const intValue = parseInt(`${value}`, 10);

        if (!Number.isNaN(intValue)) {
            return intValue;
        }
    }

    return alt;
}
