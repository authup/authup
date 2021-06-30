export class TokenResponseError extends Error {
    /**
     * @link https://www.tutorialspoint.com/oauth2.0/error_response_codes.htm
     */
    public code : string = 'server_error';

    constructor(message: string, code?: string) {
        super(message);

        if(typeof code === 'string') {
            this.code = code;
        }
    }
}
