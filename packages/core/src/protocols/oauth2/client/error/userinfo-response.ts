import {parseResponseError} from "./utils";

export class UserinfoResponseError extends Error {
    /**
     * @link https://www.tutorialspoint.com/oauth2.0/error_response_codes.htm
     */
    public code : string = 'server_error';

    public statusCode : number = 500;

    constructor(e: Error) {
        super(e.message);

        const {code, statusCode, message} = parseResponseError(e);

        if(typeof code === 'string') {
            this.code = code;
        }

        if(typeof statusCode === 'number') {
            this.statusCode = statusCode;
        }

        this.message = message;
    }
}
