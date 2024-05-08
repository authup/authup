import type { Options } from '@ebec/http';

export type AuthupErrorOptions = Options & {
    codePrefix?: string
};

export type AuthupErrorOptionsInput = AuthupErrorOptions |
string |
Error;
