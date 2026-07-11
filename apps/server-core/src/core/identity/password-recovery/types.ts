/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IMailClient, IMailTemplateRenderer } from '../../mail/types.ts';
import type { IRealmRepository, IUserRepository } from '../../entities/index.ts';
import type { IdentityWorkflowContext } from '../types.ts';

export type PasswordRecoveryServiceOptions = {
    passwordRecoveryEnabled?: boolean,
    emailVerificationEnabled?: boolean,
    publicUrl?: string,
    passwordMinLength?: number,
};

export type PasswordRecoveryServiceContext = {
    options: PasswordRecoveryServiceOptions,
    mailClient: IMailClient,
    mailTemplateRenderer: IMailTemplateRenderer,
    repository: IUserRepository,
    realmRepository: IRealmRepository,
};

export type PasswordForgotResult = {
    reset_expires: string,
};

export type PasswordResetResult = {
    reset_at: string,
};

export interface IPasswordRecoveryService {
    forgotPassword(data: Record<string, any>, context?: IdentityWorkflowContext): Promise<PasswordForgotResult>;
    resetPassword(data: Record<string, any>): Promise<PasswordResetResult>;
}
