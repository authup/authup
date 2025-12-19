/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from './types';

export abstract class OAuth2BaseTokenIssuer implements IOAuth2TokenIssuer {
    protected options: OAuth2TokenIssuerOptions;

    protected constructor(options?: OAuth2TokenIssuerOptions) {
        this.options = options || {};
    }

    abstract issue(input: OAuth2TokenPayload, options?: OAuth2TokenIssuerOptions): Promise<OAuth2TokenIssuerResponse>;

    protected buildExp(input: OAuth2TokenPayload, options: OAuth2TokenIssuerOptions = {}) {
        const utc = Math.floor(new Date().getTime() / 1000);

        let exp: number;
        if (options.maxAge) {
            exp = utc + options.maxAge;
        } else if (this.options.maxAge) {
            exp = utc + this.options.maxAge;
        } else if (input.exp) {
            exp = input.exp;
        } else {
            exp = utc + 3_600;
        }

        return exp;
    }
}
