/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';

export type UserCreatePayload = Partial<User>;
export type UserUpdatePayload = Partial<User> & { password_repeat?: User['password'] };
export type UserSavePayload = Partial<User> & { password_repeat?: User['password'] };

export type RegisterPayload = Partial<Pick<User, 'email' | 'name' | 'password' | 'realm_id'>>;
export type RegisterResponse = {
    active: boolean,
};

export type ActivatePayload = {
    token: string,
};
export type ActivateResponse = null;

export type PasswordForgotPayload = Partial<Pick<User, 'email' | 'name' | 'realm_id'>>;
export type PasswordForgotResponse = {
    reset_expires: string,
};

export type PasswordResetPayload = Partial<Pick<User, 'email' | 'name' | 'realm_id'>> & {
    token: string,
    password: string,
};
export type PasswordResetResponse = {
    reset_at: string,
};
