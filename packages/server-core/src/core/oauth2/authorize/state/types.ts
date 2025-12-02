/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizeCodeRequest } from '@authup/core-kit';

export type OAuth2AuthorizeState = {
    codeRequest?: OAuth2AuthorizeCodeRequest,
    ip: string,
    userAgent: string
};

export interface IOAuth2AuthorizeStateRepository {
    findOneById(id: string) : Promise<OAuth2AuthorizeState | null>;

    insert(data: OAuth2AuthorizeState) : Promise<string>;

    remove(id: string) : Promise<void>;
}
