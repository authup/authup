/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import {
    DContext,
    DController,
    DGet,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { sendRedirect } from 'routup';
import { resolveURL } from '../../../../../utils/index.ts';

export type OpenIDControllerOptions = {
    baseURL: string
};

@DController('')
export class OpenIDController {
    protected options: OpenIDControllerOptions;

    constructor(options: OpenIDControllerOptions) {
        this.options = options;
    }

    @DGet('/.well-known/openid-configuration', [])
    getOpenIdConfiguration(@DContext() event: IAppEvent) {
        // A single global discovery doc can't satisfy OIDC Discovery §4.3 /
        // RFC 8414 §3.3: tokens are issued per realm (iss=<baseURL>/realms/<name>),
        // so a global `issuer` would never match the `iss` of any token.
        // Redirect to the master realm's realm-scoped, conformant doc.
        // ponytail: master is the default realm; swap REALM_MASTER_NAME for a
        // config key if a deployment ever needs a different default.
        return sendRedirect(
            event,
            resolveURL(this.options.baseURL, `realms/${REALM_MASTER_NAME}/.well-known/openid-configuration`),
        );
    }
}
