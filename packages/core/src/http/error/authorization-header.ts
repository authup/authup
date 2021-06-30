export class AuthorizationHeaderError extends Error {
    public code : string = 'invalid_header';

    constructor(message: string, code?: string) {
        super(message);

        if(typeof code === 'string') {
            this.code = code;
        }
    }

    static parse() {
        throw new AuthorizationHeaderError(`The authorization header value could not be parsed.`);
    }

    static parseType() {
        throw new AuthorizationHeaderError(`The authorization header value type must either be 'Bearer' or 'Basic'`);
    }
}
