/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { singa } from 'singa';
import { useConfig } from '../../../config';
import { OAuth2AuthorizationService } from './module';

const instance = singa<OAuth2AuthorizationService>({
    name: 'oauth2Authorization',
    factory: () => {
        const config = useConfig();

        return new OAuth2AuthorizationService({
            issuer: config.publicUrl,
            accessTokenMaxAge: config.tokenAccessMaxAge || 7200,
            authorizationCodeMaxAge: 300,
            idTokenMaxAge: config.tokenAccessMaxAge,
        });
    },
});

export function useOAuth2AuthorizationService() {
    return instance.use();
}
