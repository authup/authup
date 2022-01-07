/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenControllerOptions } from './token';
import { Oauth2ProviderControllerOptions } from './oauth2-provider';

export type ControllerRegistrationContext = {
    controller: {
        token: Omit<TokenControllerOptions, 'writableDirectoryPath' | 'selfUrl'> &
        Partial<Pick<TokenControllerOptions, 'writableDirectoryPath' | 'selfUrl'>>,
        oauth2Provider: Omit<Oauth2ProviderControllerOptions, 'writableDirectoryPath' | 'selfUrl'> &
        Partial<Pick<Oauth2ProviderControllerOptions, 'writableDirectoryPath' | 'selfUrl'>>,
    },
    selfUrl: string,
    writableDirectoryPath: string,
};
