/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationPermissionFrench : NamespaceTranslations<`${PermissionName}`> = {
    [PermissionName.CLIENT_CREATE]: 'Créer des clients',
    [PermissionName.CLIENT_DELETE]: 'Supprimer les clients',
    [PermissionName.CLIENT_UPDATE]: 'Modifier les clients',
    [PermissionName.CLIENT_READ]: 'Lire les clients',
    [PermissionName.CLIENT_SELF_MANAGE]: 'Gérer son propre client',

    [PermissionName.CLIENT_PERMISSION_CREATE]: 'Attribuer des permissions de client',
    [PermissionName.CLIENT_PERMISSION_DELETE]: 'Retirer des permissions de client',
    [PermissionName.CLIENT_PERMISSION_READ]: 'Lire les permissions de client',
    [PermissionName.CLIENT_PERMISSION_UPDATE]: 'Modifier les permissions de client',

    [PermissionName.CLIENT_ROLE_CREATE]: 'Attribuer des rôles de client',
    [PermissionName.CLIENT_ROLE_DELETE]: 'Retirer des rôles de client',
    [PermissionName.CLIENT_ROLE_UPDATE]: 'Modifier les rôles de client',
    [PermissionName.CLIENT_ROLE_READ]: 'Lire les rôles de client',

    [PermissionName.CLIENT_SCOPE_CREATE]: 'Attribuer des portées de client',
    [PermissionName.CLIENT_SCOPE_DELETE]: 'Retirer des portées de client',
    [PermissionName.CLIENT_SCOPE_READ]: 'Lire les portées de client',

    [PermissionName.CONSENT_READ]: 'Lire les consentements',
    [PermissionName.CONSENT_DELETE]: 'Supprimer les consentements',

    [PermissionName.EVENT_READ]: 'Lire les événements',

    [PermissionName.IDENTITY_PROVIDER_CREATE]: 'Créer des fournisseurs d\'identité',
    [PermissionName.IDENTITY_PROVIDER_DELETE]: 'Supprimer les fournisseurs d\'identité',
    [PermissionName.IDENTITY_PROVIDER_UPDATE]: 'Modifier les fournisseurs d\'identité',
    [PermissionName.IDENTITY_PROVIDER_READ]: 'Lire les fournisseurs d\'identité',

    [PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ]: 'Lire les comptes liés',
    [PermissionName.IDENTITY_PROVIDER_ACCOUNT_DELETE]: 'Supprimer les comptes liés',

    [PermissionName.IDENTITY_PROVIDER_ROLE_CREATE]: 'Attribuer des correspondances de rôles de fournisseur d\'identité',
    [PermissionName.IDENTITY_PROVIDER_ROLE_DELETE]: 'Retirer des correspondances de rôles de fournisseur d\'identité',
    [PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE]: 'Modifier les correspondances de rôles de fournisseur d\'identité',
    [PermissionName.IDENTITY_PROVIDER_ROLE_READ]: 'Lire les correspondances de rôles de fournisseur d\'identité',

    [PermissionName.KEY_CREATE]: 'Créer des clés',
    [PermissionName.KEY_DELETE]: 'Supprimer les clés',
    [PermissionName.KEY_UPDATE]: 'Modifier les clés',
    [PermissionName.KEY_READ]: 'Lire les clés',

    [PermissionName.PATH_CREATE]: 'Créer des chemins',
    [PermissionName.PATH_DELETE]: 'Supprimer les chemins',
    [PermissionName.PATH_UPDATE]: 'Modifier les chemins',
    [PermissionName.PATH_READ]: 'Lire les chemins',

    [PermissionName.PERMISSION_CREATE]: 'Créer des permissions',
    [PermissionName.PERMISSION_DELETE]: 'Supprimer les permissions',
    [PermissionName.PERMISSION_UPDATE]: 'Modifier les permissions',
    [PermissionName.PERMISSION_READ]: 'Lire les permissions',
    [PermissionName.PERMISSION_CHECK]: 'Vérifier les permissions d\'autres identités',

    [PermissionName.REALM_CREATE]: 'Créer des domaines',
    [PermissionName.REALM_DELETE]: 'Supprimer les domaines',
    [PermissionName.REALM_UPDATE]: 'Modifier les domaines',
    [PermissionName.REALM_READ]: 'Lire les domaines',

    [PermissionName.ROLE_CREATE]: 'Créer des rôles',
    [PermissionName.ROLE_DELETE]: 'Supprimer les rôles',
    [PermissionName.ROLE_UPDATE]: 'Modifier les rôles',
    [PermissionName.ROLE_READ]: 'Lire les rôles',

    [PermissionName.ROLE_PERMISSION_CREATE]: 'Attribuer des permissions de rôle',
    [PermissionName.ROLE_PERMISSION_DELETE]: 'Retirer des permissions de rôle',
    [PermissionName.ROLE_PERMISSION_READ]: 'Lire les permissions de rôle',
    [PermissionName.ROLE_PERMISSION_UPDATE]: 'Modifier les permissions de rôle',

    [PermissionName.SCOPE_CREATE]: 'Créer des portées',
    [PermissionName.SCOPE_DELETE]: 'Supprimer les portées',
    [PermissionName.SCOPE_UPDATE]: 'Modifier les portées',
    [PermissionName.SCOPE_READ]: 'Lire les portées',

    [PermissionName.SESSION_READ]: 'Lire les sessions',
    [PermissionName.SESSION_DELETE]: 'Supprimer les sessions',

    [PermissionName.TOKEN_INTROSPECT]: 'Introspecter les jetons',

    [PermissionName.USER_CREATE]: 'Créer des utilisateurs',
    [PermissionName.USER_DELETE]: 'Supprimer les utilisateurs',
    [PermissionName.USER_UPDATE]: 'Modifier les utilisateurs',
    [PermissionName.USER_READ]: 'Lire les utilisateurs',
    [PermissionName.USER_SELF_MANAGE]: 'Gérer son propre compte',

    [PermissionName.USER_AUTHENTICATOR_CREATE]: 'Créer des authentificateurs',
    [PermissionName.USER_AUTHENTICATOR_DELETE]: 'Supprimer les authentificateurs',
    [PermissionName.USER_AUTHENTICATOR_UPDATE]: 'Modifier les authentificateurs',
    [PermissionName.USER_AUTHENTICATOR_READ]: 'Lire les authentificateurs',

    [PermissionName.USER_PERMISSION_CREATE]: 'Attribuer des permissions d\'utilisateur',
    [PermissionName.USER_PERMISSION_DELETE]: 'Retirer des permissions d\'utilisateur',
    [PermissionName.USER_PERMISSION_READ]: 'Lire les permissions d\'utilisateur',
    [PermissionName.USER_PERMISSION_UPDATE]: 'Modifier les permissions d\'utilisateur',

    [PermissionName.USER_ROLE_CREATE]: 'Attribuer des rôles d\'utilisateur',
    [PermissionName.USER_ROLE_DELETE]: 'Retirer des rôles d\'utilisateur',
    [PermissionName.USER_ROLE_UPDATE]: 'Modifier les rôles d\'utilisateur',
    [PermissionName.USER_ROLE_READ]: 'Lire les rôles d\'utilisateur',
};
