/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntitySchemaAPI, IEntityStatsAPI } from '../../stats';
import type { APIRequestOptions, EntityRecordResponse, IEntityAPI } from '../../types-base';

import type { User } from '@authup/core-kit';

// Mirrors `UserValidator` mounts in @authup/core-kit.
// `passwordRepeat` is NOT validator-mounted but is accepted by the controller for password
// confirmation; it is only carried on update/save shapes.
type UserOptionalFields = Pick<User, 'nameLocked' |
    'emailVerified' |
    'firstName' |
    'lastName' |
    'displayName' |
    'password' |
    'active' |
    'realmId' |
    'pathId' |
    'status' |
    'statusMessage'>;

export type UserCreatePayload = Pick<User, 'name' | 'email'> &
    Partial<UserOptionalFields>;

export type UserUpdatePayload = Partial<UserCreatePayload> & { passwordRepeat?: User['password'] };
export type UserSavePayload = UserCreatePayload & { passwordRepeat?: User['password'] };

export type RegisterPayload = Partial<Pick<User, 'email' | 'name' | 'password' | 'realmId'>>;
export type RegisterResponse = {
    active: boolean,
};

export type ActivatePayload = {
    token: string,
};
export type ActivateResponse = null;

export type PasswordForgotPayload = Partial<Pick<User, 'email' | 'name' | 'realmId'>>;
export type PasswordForgotResponse = {
    resetExpires: string,
};

export type PasswordResetPayload = Partial<Pick<User, 'email' | 'name' | 'realmId'>> & {
    token: string,
    password: string,
};
export type PasswordResetResponse = {
    resetAt: string,
};

export interface IUserAPI extends IEntityAPI<User, UserCreatePayload, UserUpdatePayload>,
    IEntitySchemaAPI, IEntityStatsAPI<User> {
    createOrUpdate(idOrName: string, data: UserSavePayload, options?: APIRequestOptions) : Promise<EntityRecordResponse<User>>;
    activate(token: string, options?: APIRequestOptions) : Promise<ActivateResponse>;
    register(data: RegisterPayload, options?: APIRequestOptions) : Promise<RegisterResponse>;
    passwordForgot(data: PasswordForgotPayload, options?: APIRequestOptions) : Promise<PasswordForgotResponse>;
    passwordReset(data: PasswordResetPayload, options?: APIRequestOptions) : Promise<PasswordResetResponse>;
}
