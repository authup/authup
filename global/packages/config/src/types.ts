/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ReadContext = {
    directory?: string
};

export type ConfigRaw = {
    client: Record<string, Record<string, any>>
    server: Record<string, Record<string, any>>,
};
