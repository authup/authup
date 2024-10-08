/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/kit';
import { createValidator } from '@validup/adapter-validator';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { Container, ValidupNestedError, ValidupValidatorError } from 'validup';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import {
    loadOAuth2SubEntity, loadOAuth2SubPermissions,
    readOAuth2TokenPayload, resolveOpenIdClaimsFromSubEntity,
} from '../../../../oauth2';
import { useRequestEnv } from '../../../../request';

export class TokenIntrospectRequestValidator extends Container<{ token: string }> {
    constructor() {
        super();

        this.mount('token', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 16, max: 2048 })));
    }
}

export async function introspectTokenRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const validator = new TokenIntrospectRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    let token : string | undefined;
    try {
        const data = await validatorAdapter.run(req, {
            locations: ['body', 'query', 'params'],
        });

        token = data.token;
    } catch (e) {
        token = useRequestEnv(req, 'token');
    }

    if (!token) {
        const validatorError = new ValidupValidatorError({
            path: 'token',
            pathAbsolute: 'token',
        });

        throw new ValidupNestedError({
            children: [validatorError],
        });
    }

    const payload = await readOAuth2TokenPayload(token);
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
