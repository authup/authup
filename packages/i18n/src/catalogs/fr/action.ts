/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationActionKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationActionFrench : NamespaceTranslations<`${TranslatorTranslationActionKey}`> = {
    [TranslatorTranslationActionKey.ADD]: 'Ajouter',
    [TranslatorTranslationActionKey.CREATE]: 'Créer',
    [TranslatorTranslationActionKey.DELETE]: 'Supprimer',
    [TranslatorTranslationActionKey.GENERATE]: 'Générer',
    [TranslatorTranslationActionKey.UPDATE]: 'Mettre à jour',
    [TranslatorTranslationActionKey.AUTHORIZE]: 'Autoriser',
    [TranslatorTranslationActionKey.ABORT]: 'Annuler',
    [TranslatorTranslationActionKey.LOGIN]: 'Connexion',

    [TranslatorTranslationActionKey.REGISTER]: 'S\'inscrire',
    [TranslatorTranslationActionKey.ACTIVATE]: 'Activer',
    [TranslatorTranslationActionKey.RESET]: 'Réinitialiser',
    [TranslatorTranslationActionKey.SEND]: 'Envoyer',
    [TranslatorTranslationActionKey.BACK]: 'Retour',
    [TranslatorTranslationActionKey.CLOSE]: 'Fermer',
    [TranslatorTranslationActionKey.LOOKUP]: 'Rechercher',
    [TranslatorTranslationActionKey.SHOW]: 'Afficher',
    [TranslatorTranslationActionKey.HIDE]: 'Masquer',
    [TranslatorTranslationActionKey.REMOVE]: 'Retirer',
};
