export class TokenRequestError extends Error {
    public code : string = 'invalid_token';

    static formatInvalid() {
        return new TokenRequestError('The format of the authorization token is not valid.');
    }

    static typeInvalid() {
        return new TokenRequestError('The authorization token type is not valid.')
    }
}
