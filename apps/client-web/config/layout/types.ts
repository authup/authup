/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LayoutKey } from './contants';

export type NavigationItemMeta = {
    [LayoutKey.REQUIRED_LOGGED_IN]?: boolean,
    [LayoutKey.REQUIRED_LOGGED_OUT]?: boolean,
    [LayoutKey.REQUIRED_PERMISSIONS]?: string | string[]
};
