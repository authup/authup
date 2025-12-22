/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { ISessionManager } from '../../authentication';
import type { IOAuth2TokenIssuer } from '../token';
import type { BaseGrantContext, IOAuth2Grant, OAuth2GrantRunWIthOptions } from './types';

export abstract class OAuth2BaseGrant<
    T = ObjectLiteral,
> implements IOAuth2Grant<T> {
    protected accessTokenIssuer : IOAuth2TokenIssuer;

    protected sessionManager : ISessionManager;

    // -----------------------------------------------------

    constructor(ctx: BaseGrantContext) {
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.sessionManager = ctx.sessionManager;
    }

    // -----------------------------------------------------

    abstract runWith(input: T, options?: OAuth2GrantRunWIthOptions): Promise<OAuth2TokenGrantResponse>;
}
