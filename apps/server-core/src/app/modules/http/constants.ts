/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { IServer } from '../../../adapters/http/index.ts';

export const HTTPInjectionKey = {
    Server: new TypedToken<IServer>('Server'),
} as const;
