/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HandlerInterface } from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { useRequestIdentityOrFail } from '../../../request/index.ts';

export class ForceLoggedInMiddleware implements HandlerInterface {
    public run(event: IAppEvent) {
        useRequestIdentityOrFail(event);
        return event.next();
    }
}
