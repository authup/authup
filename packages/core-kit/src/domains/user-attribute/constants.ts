/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * User attributes with a meaning authup itself reads.
 *
 * Any name is a legal attribute, and these two are ordinary rows under the
 * user's own `USER_SELF_MANAGE`: what makes them reserved is that the claims
 * builder maps them onto the `locale` / `color_mode` claims, the kit store
 * seeds the browser from them and writes a switcher change back, and the
 * attribute service validates their VALUES (a BCP47 tag, an
 * `OAuth2UIColorMode`), which it does for no other name.
 */
export enum UserAttributeName {
    LOCALE = 'locale',
    COLOR_MODE = 'colorMode',
}
