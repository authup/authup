/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface IPolicyData {
    set(key: string, value: unknown) : void;
    has(key: string): boolean;
    get<T = unknown>(key: string) : T;

    isValidated(key: string): boolean;
    setValidated(key: string) : void;

    clone() : IPolicyData
}

export class PolicyData implements IPolicyData {
    protected data: Record<string, any>;

    protected validated : Set<string>;

    constructor(
        data: Record<string, any> = {},
        validated: Set<string> = new Set(),
    ) {
        this.data = data;
        this.validated = validated;
    }

    set<T = unknown>(key: string, value: T) : void {
        this.data[key] = value;
        this.validated.delete(key);
    }

    get<T = unknown>(key: string) : T {
        const item = this.data[key];
        if (typeof item === 'undefined') {
            throw new Error(`Policy data item ${key} does not exist.`);
        }

        return item;
    }

    has(key: string): boolean {
        return key in this.data;
    }

    setValidated(key: string) : void {
        this.validated.add(key);
    }

    isValidated(key: string) : boolean {
        return this.validated.has(key);
    }

    clone() {
        return new PolicyData({
            ...this.data,
        }, this.validated);
    }
}
