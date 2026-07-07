/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationClientKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationClientEnglish : NamespaceTranslations<`${TranslatorTranslationClientKey}`> = {
    [TranslatorTranslationClientKey.NAME_HINT]: 'Something users will recognize and trust',
    [TranslatorTranslationClientKey.DESCRIPTION_HINT]: 'Displayed to all users of this application',
    [TranslatorTranslationClientKey.REDIRECT_URI_HINT]: 'URI pattern a browser can redirect to after a successful login',
    [TranslatorTranslationClientKey.IS_CONFIDENTIAL]: 'Is confidential?',
    [TranslatorTranslationClientKey.IS_ACTIVE]: 'Is active?',
    [TranslatorTranslationClientKey.HASH_SECRET]: 'Hash secret?',

    [TranslatorTranslationClientKey.LOGIN_FAILED]: 'The login operation failed',
    [TranslatorTranslationClientKey.SCOPE_GRANT_INTRO]: 'This will allow the {client} application to',
    [TranslatorTranslationClientKey.ONCE_AUTHORIZED_REDIRECT]: 'Once authorized, you will be redirected to {target}.',
    [TranslatorTranslationClientKey.GOVERNED_BY]: 'This application is governed by the {{client}} application\'s {privacyPolicy} and {termsOfService}.',
    [TranslatorTranslationClientKey.ACTIVE_SINCE]: 'Active since',
    [TranslatorTranslationClientKey.VIEW_POLICY_DETAILS]: 'View policy details',
    [TranslatorTranslationClientKey.PRIVACY_POLICY]: 'Privacy Policy',
    [TranslatorTranslationClientKey.TERMS_OF_SERVICE]: 'Terms of Service',

    [TranslatorTranslationClientKey.POLICY_TYPE_COMPOSITE]: 'Composite',
    [TranslatorTranslationClientKey.POLICY_TYPE_DATE]: 'Date',
    [TranslatorTranslationClientKey.POLICY_TYPE_TIME]: 'Time',
    [TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTE_NAMES]: 'Attr Names',
    [TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTES]: 'Attributes',
    [TranslatorTranslationClientKey.POLICY_TYPE_REALM_MATCH]: 'Realm Match',
    [TranslatorTranslationClientKey.POLICY_TYPE_IDENTITY]: 'Identity',
    [TranslatorTranslationClientKey.POLICY_TYPE_PERMISSION_BINDING]: 'Perm Binding',

    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_UNANIMOUS]: 'All policies must evaluate positively.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_AFFIRMATIVE]: 'At least one policy must evaluate positively.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_CONSENSUS]: 'More policies must evaluate positively than negatively.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_DEFAULT]: 'No strategy selected. Defaults to unanimous (all policies must evaluate positively).',
    [TranslatorTranslationClientKey.OPTION_NONE_UNANIMOUS]: '-- None (default: unanimous) --',

    [TranslatorTranslationClientKey.REALM_MATCH_STRICT_HINT]: 'Only match if the attribute is strict equal to the name?',
    [TranslatorTranslationClientKey.REALM_MATCH_NULL_MATCH_ALL_HINT]: 'Determines if resources with null realm-id/name value should match all identity realms.{br}If true, any identity realm can access resources with null realm-id/name values.',

    [TranslatorTranslationClientKey.ENABLE_STARTTLS_HINT]: 'Enable StartTLS process?',
    [TranslatorTranslationClientKey.PASSWORD_MUST_MATCH]: 'Must match the password.',
    [TranslatorTranslationClientKey.LOOKUP_FAILED]: 'Lookup failed with: {{message}}',
    [TranslatorTranslationClientKey.PROTOCOL_NOT_SUPPORTED]: '{{name}} is not supported yet.',

    [TranslatorTranslationClientKey.JUNCTION_POLICY]: 'Junction Policy',
    [TranslatorTranslationClientKey.JUNCTION_REALM_SCOPE]: 'Realm Scope',
    [TranslatorTranslationClientKey.REALM_SCOPE_NONE]: 'None',
    [TranslatorTranslationClientKey.REALM_SCOPE_NONE_HINT]: 'No reach — matches no realm; a disabled grant.',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN]: 'Own realm',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_HINT]: 'Acts only on the holder\'s own realm.',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_OR_NULL]: 'Own + global',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_OR_NULL_HINT]: 'Own realm plus global (realm-less) resources.',
    [TranslatorTranslationClientKey.REALM_SCOPE_ANY]: 'Any realm',
    [TranslatorTranslationClientKey.REALM_SCOPE_ANY_HINT]: 'Acts on every realm, including global. Admin-level reach.',
    [TranslatorTranslationClientKey.SELECTION_UPDATING]: 'Updating selection',
    [TranslatorTranslationClientKey.SELECTION_REMOVE]: 'Remove from selection',
    [TranslatorTranslationClientKey.SELECTION_ADD]: 'Add to selection',

    [TranslatorTranslationClientKey.CREATE_ACCOUNT]: 'Create account',
    [TranslatorTranslationClientKey.FORGOT_PASSWORD]: 'Forgot password?',
    [TranslatorTranslationClientKey.RESET_PASSWORD]: 'Reset password',
    [TranslatorTranslationClientKey.ACTIVATE_ACCOUNT]: 'Activate account',
    [TranslatorTranslationClientKey.BACK_TO_LOGIN]: 'Back to login',
    [TranslatorTranslationClientKey.EMAIL_OR_NAME]: 'Email or name',
    [TranslatorTranslationClientKey.CHECK_EMAIL_ACTIVATE]: 'Check your email for the activation code.',
    [TranslatorTranslationClientKey.CHECK_EMAIL_RESET]: 'Check your email for the reset code.',
    [TranslatorTranslationClientKey.ACCOUNT_ACTIVATED]: 'The account was successfully activated.',
    [TranslatorTranslationClientKey.PASSWORD_RESET_DONE]: 'The password was successfully reset.',
    [TranslatorTranslationClientKey.WORKFLOW_DISABLED]: 'This feature is not enabled.',

    [TranslatorTranslationClientKey.REALM_MISMATCH_TITLE]: 'Sign in with a different account',
    [TranslatorTranslationClientKey.REALM_MISMATCH_TEXT]: '{{client}} belongs to the {{realm}} realm, but you are signed in to a different realm. Sign in with a {{realm}} account to continue.',
    [TranslatorTranslationClientKey.SIGN_IN_TO_REALM]: 'Sign in to {{realm}}',
    [TranslatorTranslationClientKey.RETURN_TO_APP]: 'Return to application',
};
