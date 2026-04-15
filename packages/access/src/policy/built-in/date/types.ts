/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '../../types';

export interface DatePolicy extends BasePolicy {
    start?: string | Date | number,

    end?: string | Date | number,
}
