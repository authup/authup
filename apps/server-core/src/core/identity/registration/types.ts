/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IMailClient, IMailTemplateRenderer } from '../../mail/types.ts';
import type { IRealmRepository, IUserRepository } from '../../entities/index.ts';
import type { IdentityWorkflowContext } from '../types.ts';

export type RegistrationServiceOptions = {
    registrationEnabled?: boolean,
    emailVerificationEnabled?: boolean,
    publicUrl?: string,
};

export type RegistrationServiceContext = {
    options: RegistrationServiceOptions,
    mailClient: IMailClient,
    mailTemplateRenderer: IMailTemplateRenderer,
    repository: IUserRepository,
    realmRepository: IRealmRepository,
};

export type RegistrationResult = {
    active: boolean,
};

export interface IRegistrationService {
    register(data: Record<string, any>, context?: IdentityWorkflowContext): Promise<RegistrationResult>;
    activate(data: { token: string }): Promise<void>;
}
