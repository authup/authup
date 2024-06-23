/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/kit';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import type { RequestValidationChain } from '../../../../../core';
import { RequestValidator, RequestValidatorFieldSource } from '../../../../../core';
import {
    loadOAuth2SubEntity, loadOAuth2SubPermissions,
    readOAuth2TokenPayload, resolveOpenIdClaimsFromSubEntity,
} from '../../../../oauth2';
import { useRequestEnv } from '../../../../utils';

export class TokenIntrospectRequestValidator extends RequestValidator<{ token: string }> {
    constructor() {
        super();

        const chains : RequestValidationChain[] = [
            this.createFor('token', RequestValidatorFieldSource.BODY),
            this.createFor('token', RequestValidatorFieldSource.QUERY),
            this.createFor('token', RequestValidatorFieldSource.PARAMS),
            // todo: this might not work due routup context
        ].map((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 16, max: 2048 }));

        this.addOneOf(chains);
    }
}

export async function introspectTokenRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const validator = new TokenIntrospectRequestValidator();
    const data = await validator.execute(req);
    if (!data.token) {
        data.token = useRequestEnv(req, 'token');
    }

    const payload = await readOAuth2TokenPayload(data.token);
    const permissions = await loadOAuth2SubPermissions(payload.sub_kind, payload.sub, payload.scope);

    const output : OAuth2TokenIntrospectionResponse = {
        active: true,
        permissions,
        ...payload,
        ...resolveOpenIdClaimsFromSubEntity(
            payload.sub_kind,
            await loadOAuth2SubEntity(payload.sub_kind, payload.sub, payload.scope),
        ),
    };

    return send(res, output);
}
