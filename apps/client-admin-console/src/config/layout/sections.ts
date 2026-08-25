/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import type { NavigationItemTranslation } from './types';

/**
 * The entity sections that own a top-level route group
 * (`/clients`, `/users`, ...).
 */
export enum LayoutSection {
    REALMS = 'realms',
    CLIENTS = 'clients',
    SCOPES = 'scopes',
    IDENTITY_PROVIDERS = 'identity-providers',
    KEYS = 'keys',
    TRUST_ANCHORS = 'trust-anchors',
    USERS = 'users',
    ROLES = 'roles',
    POLICIES = 'policies',
    PERMISSIONS = 'permissions',
    SESSIONS = 'sessions',
    EVENTS = 'events',
}

export type LayoutSectionDescriptor = {
    /**
     * Untranslated fallback label. The sidebar replaces it with the `i18n`
     * lookup at render time, so it only surfaces before that resolves.
     */
    name: string,
    /** The section's collection route. */
    url: string,
    icon: string,
    i18n: NavigationItemTranslation,
};

/** The routes a section owns, for the consumers that address both. */
export type LayoutSectionURLs = {
    overviewUrl: string,
    addUrl: string,
};

/**
 * The single source of truth for a section's route, icon and label.
 *
 * Both the sidebar (`LayoutSideDefaultNavigation`) and the page breadcrumbs
 * (`useSectionBreadcrumb`) address a section by the same three properties, so
 * they are declared once here rather than kept in step by hand.
 *
 * Permissions deliberately stay out: they are a nav concern (which entries a
 * session may see), not an identity of the section.
 */
export const LayoutSections : Record<`${LayoutSection}`, LayoutSectionDescriptor> = {
    [LayoutSection.REALMS]: {
        name: 'Realms',
        url: '/realms',
        icon: 'fa6-solid:building',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.REALM,
            count: 2,
        },
    },
    [LayoutSection.CLIENTS]: {
        name: 'Clients',
        url: '/clients',
        icon: 'fa6-solid:cube',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.CLIENT,
            count: 2,
        },
    },
    [LayoutSection.SCOPES]: {
        name: 'Scopes',
        url: '/scopes',
        icon: 'fa6-solid:meteor',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.SCOPE,
            count: 2,
        },
    },
    [LayoutSection.IDENTITY_PROVIDERS]: {
        name: 'Identity Providers',
        url: '/identity-providers',
        icon: 'fa6-solid:atom',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.IDENTITY_PROVIDER,
            count: 2,
        },
    },
    [LayoutSection.KEYS]: {
        name: 'Keys',
        url: '/keys',
        icon: 'fa6-solid:key',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.KEY,
            count: 2,
        },
    },
    [LayoutSection.TRUST_ANCHORS]: {
        name: 'Trusted CAs',
        url: '/trust-anchors',
        icon: 'fa6-solid:certificate',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.TRUST_ANCHOR,
            count: 2,
        },
    },
    [LayoutSection.USERS]: {
        name: 'Users',
        url: '/users',
        icon: 'fa6-solid:user',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.USER,
            count: 2,
        },
    },
    [LayoutSection.ROLES]: {
        name: 'Roles',
        url: '/roles',
        icon: 'fa6-solid:masks-theater',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.ROLE,
            count: 2,
        },
    },
    [LayoutSection.POLICIES]: {
        name: 'Policies',
        url: '/policies',
        icon: 'fa6-solid:scale-balanced',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.POLICY,
            count: 2,
        },
    },
    [LayoutSection.PERMISSIONS]: {
        name: 'Permissions',
        url: '/permissions',
        icon: 'fa6-solid:key',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.PERMISSION,
            count: 2,
        },
    },
    [LayoutSection.SESSIONS]: {
        name: 'Sessions',
        url: '/sessions',
        icon: 'fa6-solid:desktop',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.SESSION,
            count: 2,
        },
    },
    [LayoutSection.EVENTS]: {
        name: 'Events',
        url: '/events',
        icon: 'fa6-solid:clipboard-list',
        i18n: {
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.EVENT,
            count: 2,
        },
    },
};

/**
 * A section's own routes.
 *
 * The `/add` suffix is derived HERE rather than at the call sites because two
 * consumers address it: the breadcrumb's `Add` leaf and `<AContentAction>`'s
 * `overview-url` / `add-url` pair. Spelling it per page would reintroduce the
 * drift `LayoutSections` exists to prevent, and the failure is silent:
 * `<AContentAction>` renders NOTHING on a route that matches neither of its
 * two props, so a section whose url moved would lose its only remaining entry
 * point to the create form with no error.
 */
export function buildSectionURLs(section: `${LayoutSection}`) : LayoutSectionURLs {
    const { url } = LayoutSections[section];

    return {
        overviewUrl: url,
        addUrl: `${url}/add`,
    };
}
