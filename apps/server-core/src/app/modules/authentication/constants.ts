/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type { ISessionManager, ISessionRepository } from '../../../core/index.ts';

export const AuthenticationInjectionKey = {
    SessionManager: new TypedToken<ISessionManager>('SessionManager'),
    SessionRepository: new TypedToken<ISessionRepository>('SessionRepository'),
} as const;
