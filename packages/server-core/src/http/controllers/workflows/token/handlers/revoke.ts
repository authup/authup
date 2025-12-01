/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { OAuth2TokenVerifier } from '../../../../../core/oauth2';
import { OAuth2KeyRepository } from '../../../../../core/oauth2/key';
import { OAuth2TokenRepository } from '../../../../../core/oauth2/token/repository';
import { extractTokenFromRequest } from '../utils';

export async function revokeTokenRouteHandler(
    req: Request,
    res: Response,
) {
    const token = await extractTokenFromRequest(req);

    const keyRepository = new OAuth2KeyRepository();
    const tokenRepository = new OAuth2TokenRepository();

    const tokenVerifier = new OAuth2TokenVerifier(keyRepository, tokenRepository);

    const payload = await tokenVerifier.verify(token);

    await tokenRepository.remove(payload.jti);
    await tokenRepository.setInactive(payload.jti, payload.exp);

    return sendAccepted(res);
}
