/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NameValidOptions } from '../../helpers';
import { isNameValid } from '../../helpers';

export function isRobotNameValid(name: string, options: NameValidOptions = {}) : boolean {
    return isNameValid(name, options);
}
