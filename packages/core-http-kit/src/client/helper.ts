/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientError } from 'hapic';
import { isClientError as isError } from 'hapic';

export function isClientError(input: unknown) : input is ClientError {
    return isError(input);
}
