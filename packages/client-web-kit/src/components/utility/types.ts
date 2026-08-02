/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinkProperties } from '@vuecs/link';

export type AAccountShellNavItem = {
    key: string,
    label: string,
    icon?: string,
    link: LinkProperties,
    active?: boolean,
};
