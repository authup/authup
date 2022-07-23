import { User } from '@authelion/common';

export function getOpenIDClaimsForScope(scope: string, user: User) : Record<string, any> {
    switch (scope) {
        case 'profile': {
            return {
                name: user.name,
                family_name: user.last_name,
                given_name: user.first_name,
                nickname: user.display_name,
                preferred_username: user.display_name,
                // profile
                // picture
                // website
                // gender
                // birthdate
                // zoneinfo
                // locale
                updated_at: user.updated_at,
            };
        }
        case 'email': {
            return {
                email: user.email,
                // email_verified
            };
        }
        case 'address': {
            return {

            };
        }
        case 'phone': {
            return {
                // phone_number
                // phone_number_verified
            };
        }
    }

    return {

    };
}
