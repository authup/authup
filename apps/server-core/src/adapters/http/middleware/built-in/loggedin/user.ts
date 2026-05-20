/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UnauthorizedError } from '@authup/errors';
import type { HandlerInterface } from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { useRequestIdentity } from '../../../request/index.ts';

export class ForceUserLoggedInMiddleware implements HandlerInterface {
    public run(event: IAppEvent) {
        const identity = useRequestIdentity(event);

        if (!identity || identity.type !== 'user') {
            throw new UnauthorizedError();
        }

        return event.next();
    }
}
