/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot, User } from '@authup/core';

export type DatabaseRootSeederResult = {
    robot?: Robot,
    user?: User
};
