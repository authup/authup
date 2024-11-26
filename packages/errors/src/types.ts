/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@ebec/http';

export type AuthupErrorOptions = Options & {
    codePrefix?: string
};

export type AuthupErrorOptionsInput = AuthupErrorOptions |
string |
Error;
