/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IOAuth2DeviceAuthorizationService,
    IRealmRepository,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import type { CertificateSource } from '../../../request/index.ts';

export type DeviceAuthorizationControllerContext = {
    service: IOAuth2DeviceAuthorizationService,
    clientAuthenticator: OAuth2ClientAuthenticator,
    realmRepository: IRealmRepository,
    certificateSource: CertificateSource,
};

