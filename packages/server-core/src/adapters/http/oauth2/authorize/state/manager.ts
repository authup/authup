/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizeCodeRequest } from '@authup/core-kit';
import type { Request } from 'routup';
import { OAuth2Error } from '@authup/specs';
import { useRequestQuery } from '@routup/basic/query';
import { getRequestHeader, getRequestIP } from 'routup';
import type { IOAuth2AuthorizeStateRepository, OAuth2AuthorizeState } from '../../../../../core';

export class HTTPOAuth2AuthorizeStateManager {
    protected repository: IOAuth2AuthorizeStateRepository;

    constructor(repository: IOAuth2AuthorizeStateRepository) {
        this.repository = repository;
    }

    async save(
        req: Request,
        codeRequest?: OAuth2AuthorizeCodeRequest,
    ) : Promise<string> {
        const ip = getRequestIP(req, {
            trustProxy: true,
        });
        const userAgent = getRequestHeader(req, 'user-agent');

        return this.repository.insert({
            codeRequest,
            ip,
            userAgent,
        });
    }

    async verify(req: Request): Promise<OAuth2AuthorizeState> {
        const query = useRequestQuery(req);
        if (typeof query.state !== 'string') {
            throw OAuth2Error.stateInvalid();
        }

        const payload = await this.repository.findOneById(query.state);
        if (!payload) {
            throw OAuth2Error.stateInvalid();
        }

        // avoid replay attacks
        await this.repository.remove(query.state);

        const ip = getRequestIP(req, {
            trustProxy: true,
        });
        if (ip !== payload.ip) {
            throw OAuth2Error.stateInvalid();
        }

        const userAgent = getRequestHeader(req, 'user-agent');
        if (userAgent !== payload.userAgent) {
            throw OAuth2Error.stateInvalid();
        }

        return payload;
    }
}
