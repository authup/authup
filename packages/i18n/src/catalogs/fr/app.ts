/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationAppKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationAppFrench : NamespaceTranslations<`${TranslatorTranslationAppKey}`> = {
    [TranslatorTranslationAppKey.HOME]: 'Accueil',
    [TranslatorTranslationAppKey.RESOURCES]: 'Ressources',
    [TranslatorTranslationAppKey.GENERAL]: 'Général',
    [TranslatorTranslationAppKey.OTHER]: 'Autre',
    [TranslatorTranslationAppKey.SETTINGS]: 'Paramètres',
    [TranslatorTranslationAppKey.LOGOUT]: 'Déconnexion',
    [TranslatorTranslationAppKey.ACCOUNT]: 'Compte',
    [TranslatorTranslationAppKey.SECURITY]: 'Sécurité',

    [TranslatorTranslationAppKey.MANAGEMENT]: 'Gestion',
    [TranslatorTranslationAppKey.DETAILS]: 'Détails',
    [TranslatorTranslationAppKey.API_DOCS]: 'Documentation API',
    [TranslatorTranslationAppKey.MADE_WITH]: 'Fait avec',

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'Générateur d\'URL',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Générez une URL d\'autorisation en choisissant les portées dont elle a besoin pour fonctionner.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'URL de redirection',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'URL générée',

    [TranslatorTranslationAppKey.TOGGLE_NAVIGATION]: 'Basculer la navigation',
    [TranslatorTranslationAppKey.SWITCH_TO_LIGHT_MODE]: 'Passer en mode clair',
    [TranslatorTranslationAppKey.SWITCH_TO_DARK_MODE]: 'Passer en mode sombre',

    [TranslatorTranslationAppKey.SESSION_RENEW]: 'La session sera renouvelée dans',
    [TranslatorTranslationAppKey.MINUTES]: 'minute(s)',
    [TranslatorTranslationAppKey.SECONDS]: 'seconde(s)',

    [TranslatorTranslationAppKey.ENTITY_CREATED]: '{{entity}} a été créé avec succès.',
    [TranslatorTranslationAppKey.ENTITY_UPDATED]: '{{entity}} a été mis à jour avec succès.',
    [TranslatorTranslationAppKey.ENTITY_DELETED]: '{{entity}} « {{name}} » a été supprimé avec succès.',
    [TranslatorTranslationAppKey.ACCOUNT_UPDATED]: 'Le compte a été mis à jour avec succès.',
};
