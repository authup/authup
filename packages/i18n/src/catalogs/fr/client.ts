/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationClientKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationClientFrench : NamespaceTranslations<`${TranslatorTranslationClientKey}`> = {
    [TranslatorTranslationClientKey.NAME_HINT]: 'Quelque chose que les utilisateurs reconnaîtront et auquel ils feront confiance',
    [TranslatorTranslationClientKey.DESCRIPTION_HINT]: 'Affiché à tous les utilisateurs de cette application',
    [TranslatorTranslationClientKey.REDIRECT_URI_HINT]: 'Modèle d\'URI vers lequel un navigateur peut rediriger après une connexion réussie',
    [TranslatorTranslationClientKey.IS_CONFIDENTIAL]: 'Est confidentiel ?',
    [TranslatorTranslationClientKey.IS_ACTIVE]: 'Est actif ?',
    [TranslatorTranslationClientKey.HASH_SECRET]: 'Hacher le secret ?',

    [TranslatorTranslationClientKey.LOGIN_FAILED]: 'L\'opération de connexion a échoué',
    [TranslatorTranslationClientKey.SCOPE_GRANT_INTRO]: 'Cela permettra à l\'application {client} de',
    [TranslatorTranslationClientKey.ONCE_AUTHORIZED_REDIRECT]: 'Une fois autorisé, vous serez redirigé vers {target}.',
    [TranslatorTranslationClientKey.GOVERNED_BY]: 'Cette application est régie par la {privacyPolicy} et les {termsOfService} de l\'application {{client}}.',
    [TranslatorTranslationClientKey.ACTIVE_SINCE]: 'Actif depuis',
    [TranslatorTranslationClientKey.VIEW_POLICY_DETAILS]: 'Voir les détails de la politique',

    [TranslatorTranslationClientKey.CREATE_ACCOUNT]: 'Créer un compte',
    [TranslatorTranslationClientKey.FORGOT_PASSWORD]: 'Mot de passe oublié ?',
    [TranslatorTranslationClientKey.RESET_PASSWORD]: 'Réinitialiser le mot de passe',
    [TranslatorTranslationClientKey.ACTIVATE_ACCOUNT]: 'Activer le compte',
    [TranslatorTranslationClientKey.BACK_TO_LOGIN]: 'Retour à la connexion',
    [TranslatorTranslationClientKey.EMAIL_OR_NAME]: 'E-mail ou nom',
    [TranslatorTranslationClientKey.CHECK_EMAIL_ACTIVATE]: 'Consultez vos e-mails pour obtenir le code d\'activation.',
    [TranslatorTranslationClientKey.CHECK_EMAIL_RESET]: 'Consultez vos e-mails pour obtenir le code de réinitialisation.',
    [TranslatorTranslationClientKey.ACCOUNT_ACTIVATED]: 'Le compte a été activé avec succès.',
    [TranslatorTranslationClientKey.PASSWORD_RESET_DONE]: 'Le mot de passe a été réinitialisé avec succès.',
    [TranslatorTranslationClientKey.WORKFLOW_DISABLED]: 'Cette fonctionnalité n\'est pas activée.',
    [TranslatorTranslationClientKey.PRIVACY_POLICY]: 'politique de confidentialité',
    [TranslatorTranslationClientKey.TERMS_OF_SERVICE]: 'conditions d\'utilisation',

    [TranslatorTranslationClientKey.POLICY_TYPE_COMPOSITE]: 'Composite',
    [TranslatorTranslationClientKey.POLICY_TYPE_DATE]: 'Date',
    [TranslatorTranslationClientKey.POLICY_TYPE_TIME]: 'Heure',
    [TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTE_NAMES]: 'Noms d\'attributs',
    [TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTES]: 'Attributs',
    [TranslatorTranslationClientKey.POLICY_TYPE_REALM_MATCH]: 'Correspondance de realm',
    [TranslatorTranslationClientKey.POLICY_TYPE_IDENTITY]: 'Identité',
    [TranslatorTranslationClientKey.POLICY_TYPE_PERMISSION_BINDING]: 'Liaison de permission',

    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_UNANIMOUS]: 'Toutes les politiques doivent être évaluées positivement.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_AFFIRMATIVE]: 'Au moins une politique doit être évaluée positivement.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_CONSENSUS]: 'Plus de politiques doivent être évaluées positivement que négativement.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_DEFAULT]: 'Aucune stratégie sélectionnée. Par défaut : unanime (toutes les politiques doivent être évaluées positivement).',
    [TranslatorTranslationClientKey.OPTION_NONE_UNANIMOUS]: '-- Aucune (défaut : unanime) --',

    [TranslatorTranslationClientKey.REALM_MATCH_STRICT_HINT]: 'Ne correspondre que si l\'attribut est strictement égal au nom ?',
    [TranslatorTranslationClientKey.REALM_MATCH_NULL_MATCH_ALL_HINT]: 'Détermine si les ressources dont la valeur realm-id/nom est nulle correspondent à tous les realms d\'identité.{br}Si activé, tout realm d\'identité peut accéder aux ressources dont les valeurs realm-id/nom sont nulles.',

    [TranslatorTranslationClientKey.ENABLE_STARTTLS_HINT]: 'Activer le processus StartTLS ?',
    [TranslatorTranslationClientKey.PASSWORD_MUST_MATCH]: 'Doit correspondre au mot de passe.',
    [TranslatorTranslationClientKey.LOOKUP_FAILED]: 'La recherche a échoué avec : {{message}}',
    [TranslatorTranslationClientKey.PROTOCOL_NOT_SUPPORTED]: '{{name}} n\'est pas encore pris en charge.',

    [TranslatorTranslationClientKey.JUNCTION_POLICY]: 'Politique de liaison',
    [TranslatorTranslationClientKey.JUNCTION_REALM_SCOPE]: 'Portée du domaine',
    [TranslatorTranslationClientKey.REALM_SCOPE_NONE]: 'Aucune',
    [TranslatorTranslationClientKey.REALM_SCOPE_NONE_HINT]: 'Aucune portée — ne correspond à aucun domaine ; une attribution désactivée.',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN]: 'Domaine propre',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_HINT]: 'N\'agit que sur le domaine propre du titulaire.',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_OR_NULL]: 'Propre + global',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_OR_NULL_HINT]: 'Domaine propre ainsi que les ressources globales (sans domaine).',
    [TranslatorTranslationClientKey.REALM_SCOPE_ANY]: 'Tout domaine',
    [TranslatorTranslationClientKey.REALM_SCOPE_ANY_HINT]: 'Agit sur tous les domaines, y compris global. Portée de niveau administrateur.',
    [TranslatorTranslationClientKey.SELECTION_UPDATING]: 'Mise à jour de la sélection',
    [TranslatorTranslationClientKey.SELECTION_REMOVE]: 'Retirer de la sélection',
    [TranslatorTranslationClientKey.SELECTION_ADD]: 'Ajouter à la sélection',

    [TranslatorTranslationClientKey.REALM_MISMATCH_TITLE]: 'Connectez-vous avec un autre compte',
    [TranslatorTranslationClientKey.REALM_MISMATCH_TEXT]: '{{client}} appartient au realm {{realm}}, mais vous êtes connecté à un autre realm. Connectez-vous avec un compte {{realm}} pour continuer.',
    [TranslatorTranslationClientKey.SIGN_IN_TO_REALM]: 'Se connecter à {{realm}}',
    [TranslatorTranslationClientKey.RETURN_TO_APP]: 'Retour à l\'application',

    [TranslatorTranslationClientKey.SELECT_ACCOUNT_TITLE]: 'Choisir un compte',
    [TranslatorTranslationClientKey.CONTINUE_AS]: 'Continuer en tant que {{name}}',
    [TranslatorTranslationClientKey.USE_ANOTHER_ACCOUNT]: 'Utiliser un autre compte',
    [TranslatorTranslationClientKey.SIGNED_IN_AS]: 'Connecté en tant que {{name}}',
    [TranslatorTranslationClientKey.NOT_YOU]: 'Pas vous ?',

    [TranslatorTranslationClientKey.LOGOUT_CONFIRM_TITLE]: 'Se déconnecter',
    [TranslatorTranslationClientKey.LOGOUT_CONFIRM_TEXT]: 'Voulez-vous vous déconnecter ?',
    [TranslatorTranslationClientKey.LOGOUT_DONE]: 'Vous avez été déconnecté.',
    [TranslatorTranslationClientKey.SIGN_OUT]: 'Se déconnecter',
};
