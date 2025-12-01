/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2TokenGrantResponse,
} from '@authup/specs';
import type { Request } from 'routup';

export interface IGrant {
    run(request: Request) : Promise<OAuth2TokenGrantResponse>;
}
