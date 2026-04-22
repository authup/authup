/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenVerificationData } from '../types';

export interface ITokenVerifierCache {
    get(token: string) : Promise<TokenVerificationData | undefined>;
    set(token: string, data: TokenVerificationData, seconds: number) : Promise<void>;
}
