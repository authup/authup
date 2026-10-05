/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The policy data keys that are not a policy type's own slot.
 */
export enum PolicyDataKey {
    /**
     * The grants the `identity` in the same bag holds, as `IdentityGrants`
     * (`defineIdentityGrants`). The permission binding evaluator reads them
     * from here rather than loading them, so evaluation is a function of the
     * bag alone. Whoever places an identity in the bag places its grants next
     * to it and removes both together; grants naming another subject than the
     * bag's identity are refused.
     */
    GRANTS = 'grants',
}

export interface IPolicyData {
    set(key: string, value: unknown) : void;
    has(key: string): boolean;
    get<T = unknown>(key: string) : T;
    delete(key: string) : void;

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
        if (key in this.data) {
            return this.data[key];
        }

        throw new Error(`Policy data item ${key} does not exist.`);
    }

    has(key: string): boolean {
        return key in this.data;
    }

    delete(key: string) : void {
        delete this.data[key];
        this.validated.delete(key);
    }

    setValidated(key: string) : void {
        this.validated.add(key);
    }

    isValidated(key: string) : boolean {
        return this.validated.has(key);
    }

    clone() {
        return new PolicyData({ ...this.data }, new Set(this.validated));
    }
}
