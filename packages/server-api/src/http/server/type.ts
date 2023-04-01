/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Server } from 'node:http';
import type { Router } from 'routup';

export interface HttpServerContext {
    router: Router
}

export interface HttpServerInterface extends Server {

}
