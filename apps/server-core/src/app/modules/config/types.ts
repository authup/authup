/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AccountConsoleConfig,
    AdminConsoleConfig,
    AuthConsoleConfig,
    CoreConfig,
    RootConfig,
    SECTION_KEY,
} from '@authup/server-config';

/**
 * The keys THIS service reads out of `authup.yml`: the deployment-wide
 * section, its own `core` section, and the four console keys it needs
 * to answer a request.
 *
 * It is a SELECTION, never a declaration. Every key is declared once in
 * `@authup/server-config`, so this service cannot spell a path, an
 * environment variable or a reader differently from a console service reading
 * the same key. It also cannot silently forget one: a key is either named
 * here or it is not read.
 *
 * The theme section is deliberately absent. Theming applies to a served
 * console, and since plan 101 D2 no console is served from this process.
 *
 * Its own two sections are read WHOLE and therefore flat, in the vocabulary
 * the service itself uses (`port`, not `core.port`). The console keys stay
 * under the section they belong to: three consoles each declare a `url` and
 * an `enabled`, which no flat bag can hold at once, and the nesting says
 * whose is whose.
 */
export type Config = RootConfig &
    CoreConfig &
    {
        [SECTION_KEY.AUTH_CONSOLE]: Pick<AuthConsoleConfig, 'url'>,
        [SECTION_KEY.ADMIN_CONSOLE]: Pick<AdminConsoleConfig, 'url' | 'enabled'>,
        [SECTION_KEY.ACCOUNT_CONSOLE]: Pick<AccountConsoleConfig, 'url' | 'enabled'>
    };

export type ConfigInput = Partial<Config>;

export type ConfigFactory = () => Promise<Config> | Config;

/**
 * Keys without a static default: publicUrl is derived from host and port in
 * normalizeConfig, db falls back to typeorm-extension's driver default.
 */
export type ConfigSchemaDerivedKey = 'publicUrl' | 'internalUrl' | 'db';
