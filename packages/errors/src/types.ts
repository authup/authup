/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ErrorOptions } from '@ebec/core';

export type AuthupErrorOptions = ErrorOptions & {
    data?: Record<string, any>,
};

export type AuthupErrorInput = string | AuthupErrorOptions;

export type AuthupEntityErrorOptions = AuthupErrorOptions & {
    entity?: string,
};

export type AuthupEntityErrorInput = string | AuthupEntityErrorOptions;
