/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';

export type ConfigReadFsOptions<T extends ObjectLiteral = ObjectLiteral> = {
    cwd?: string,
    file?: string | string[],
    fn?: (config: Partial<T>) => void
};

export type ConfigReadEvnOptions<T extends ObjectLiteral = ObjectLiteral> = {
    fn?: (config: Partial<T>) => void
};

export type ConfigRawReadOptions<T extends ObjectLiteral = ObjectLiteral> = {
    fs?: boolean | ConfigReadFsOptions<T>,
    env?: boolean | ConfigReadEvnOptions<T>
};
