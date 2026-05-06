/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';

export type UserCreateInput = Partial<User>;
export type UserUpdateInput = Partial<User> & { password_repeat?: User['password'] };
export type UserSaveInput = Partial<User> & { password_repeat?: User['password'] };
export type UserResponse = User;

export type RegisterInput = Partial<Pick<User, 'email' | 'name' | 'password' | 'realm_id'>>;
export type RegisterResponse = {
    active: boolean,
};

export type ActivateInput = {
    token: string,
};
export type ActivateResponse = null;

export type PasswordForgotInput = Partial<Pick<User, 'email' | 'name' | 'realm_id'>>;
export type PasswordForgotResponse = {
    reset_expires: string,
};

export type PasswordResetInput = Partial<Pick<User, 'email' | 'name' | 'realm_id'>> & {
    token: string,
    password: string,
};
export type PasswordResetResponse = {
    reset_at: string,
};
