/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NameValidOptions } from '../../helpers';
import { isNameValid } from '../../helpers';

export function isScopeNameValid(name: string, options: NameValidOptions = {}) : boolean {
    return isNameValid(name, options);
}
