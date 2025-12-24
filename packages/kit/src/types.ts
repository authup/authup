/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ObjectLiteral = Record<string | number, any>;
export type Result<T> = { success: true; data: T } | { success: false; error: Error };

export type ObjectRequired<
    T extends ObjectLiteral,
    Key extends keyof T,
> = Pick<T, Key> & Partial<Omit<T, Key>>;

export type ObjectOptional<
    T extends ObjectLiteral,
    Key extends keyof T,
> = ObjectRequired<T, Exclude<keyof T, Key>>;
