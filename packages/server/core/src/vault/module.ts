/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigInput } from '@hapic/vault';
import {
    hasClient, hasConfig, setConfig, unsetClient,
} from '@hapic/vault';

export function setVaultConfig(input: ConfigInput) {
    if (hasClient()) {
        unsetClient();
    }

    setConfig(input);
}

export function hasVaultConfig() {
    return hasConfig();
}
