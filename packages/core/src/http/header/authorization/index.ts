import {AuthorizationHeaderValue, AuthorizationHeaderValueType} from "./type";
import {AuthorizationHeaderError} from "../../error";

export * from './type';

export function parseAuthorizationHeaderValue(value: string) : AuthorizationHeaderValue {
    const parts : string[] = value.split(" ");

    const typeStr : string = parts[0].toLowerCase();

    if(['bearer', 'basic'].indexOf(typeStr) === -1) {
        throw AuthorizationHeaderError.parseType();
    }

    const type : AuthorizationHeaderValueType = typeStr as AuthorizationHeaderValueType;
    const id : string = parts[1];

    switch (type) {
        case "Basic":
            const base64Decoded = Buffer.from(id).toString('utf-8');
            const base64Parts = base64Decoded.split(":");

            if(base64Parts.length !== 2) {
                throw AuthorizationHeaderError.parse();
            }

            return {
                type: "Basic",
                username: base64Parts[0],
                password: base64Parts[1]
            }
        case "Bearer":
            return {
                type: "Bearer",
                token: id
            }
    }
}

export function buildAuthorizationHeaderValue(options: AuthorizationHeaderValue) : string {
    switch (options.type) {
        case "Basic":
            const basicStr : string = Buffer
                .from(options.username+':'+options.password)
                .toString("base64");

            return `Basic ${basicStr}`;
        case "Bearer":
            return `Bearer ${options.token}`;
    }
}
