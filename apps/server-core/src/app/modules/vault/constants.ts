/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { VaultClient } from '@authup/server-kit';
import { TypedToken } from 'eldin';

export const VaultInjectionKey = new TypedToken<VaultClient>('Vault');
