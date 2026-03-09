/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IMailClient, MailSendOptions } from '../../../../core/index.ts';

export class VoidMailClientAdapter implements IMailClient {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    send(_options: MailSendOptions): Promise<void> {
        return Promise.resolve(undefined);
    }
}
