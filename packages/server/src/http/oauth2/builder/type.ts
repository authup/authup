/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ExpressRequest } from '../../type';
import { KeyPairOptions } from '../../../utils';

export type AccessTokenBuilderContext = {
    selfUrl: string,
    request: ExpressRequest,
    maxAge?: number,
    keyPairOptions?: Partial<KeyPairOptions>
};
