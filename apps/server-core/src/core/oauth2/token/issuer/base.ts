/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from './types.ts';

export abstract class OAuth2BaseTokenIssuer implements IOAuth2TokenIssuer {
    protected options: OAuth2TokenIssuerOptions;

    // ------------------------------------------------------------------

    protected constructor(options?: OAuth2TokenIssuerOptions) {
        this.options = options || {};
    }

    // ------------------------------------------------------------------

    abstract issue(input: OAuth2TokenPayload, options?: OAuth2TokenIssuerOptions): Promise<OAuth2TokenIssuerResponse>;

    // ------------------------------------------------------------------

    buildIss(input: OAuth2TokenPayload = {}) : string | undefined {
        if (!this.options.issuer) {
            return undefined;
        }

        if (input.realm_name) {
            return `${this.options.issuer}/realms/${input.realm_name}`;
        }

        return this.options.issuer;
    }

    /**
     * Build utc expire time (in seconds).
     *
     * @param input
     */
    buildExp(input: OAuth2TokenPayload = {}) : number {
        if (input.exp) {
            return input.exp;
        }

        const utc = Math.floor(new Date().getTime() / 1000);
        if (this.options.maxAge) {
            return utc + this.options.maxAge;
        }

        return utc + 3_600;
    }
}
