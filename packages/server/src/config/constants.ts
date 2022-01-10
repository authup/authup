/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';

// eslint-disable-next-line no-shadow
export enum ConfigDefault {
    PORT = 3010,
    WRITABLE_DIRECTORY = 'writable',
}

export const ROOT_DIRECTORY = path.join(__dirname, '..', '..');
