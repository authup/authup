/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import type { IOAuth2TokenIssuer, IOAuth2TokenRevoker } from '../token';
import type { BaseGrantContext, IOAuth2Grant } from './types';

export abstract class BaseGrant<
    T = ObjectLiteral,
> implements IOAuth2Grant<T> {
    protected accessTokenIssuer : IOAuth2TokenIssuer;

    // -----------------------------------------------------

    constructor(ctx: BaseGrantContext) {
        this.accessTokenIssuer = ctx.accessTokenIssuer;
    }

    // -----------------------------------------------------

    abstract runWith(input: T, base?: OAuth2TokenPayload): Promise<OAuth2TokenGrantResponse>;
}
