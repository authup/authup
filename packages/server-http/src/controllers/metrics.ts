/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request, Response } from 'routup';
import { send } from 'routup';

export function createMetricsRouteHandler(req: Request, res: Response) {
    // todo: use prom-client to provide detailed metrics
    send(res);
}
