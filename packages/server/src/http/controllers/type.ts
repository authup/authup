/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenControllerOptions } from './token';
import { Oauth2ProviderControllerOptions } from './oauth2-provider';

export type ControllerRegisterContext = {
    token: TokenControllerOptions,
    oauth2Provider: Oauth2ProviderControllerOptions
};
