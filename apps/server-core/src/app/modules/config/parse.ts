/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { ConfigInput } from './types.ts';
import { ConfigValidator } from './validator.ts';

export async function parseConfig(input: unknown = {}): Promise<ConfigInput> {
    const validator = new ConfigValidator();

    return validator.run(isObject(input) ? input : {});
}
