# Identity Providers

An identity provider lets people sign in to Authup with an account they already
have somewhere else: another Authup instance, Keycloak, Authentik, GitHub,
Google, an LDAP directory, or any OAuth2 / OpenID Connect server.

Providers are configured per realm in the admin console under
**Identity Providers**. Each one appears as a button on that realm's login
page.

## What a login looks like

1. The person opens an application, which sends them to Authup's hosted
   `/authorize` page.
2. They pick a provider instead of typing a password.
3. Authup sends them to that provider, where they authenticate.
4. The provider sends them back to Authup, which establishes the session and
   returns them to the same `/authorize` page they started on.
5. That page finishes the login the way it finishes any other one: it applies
   `prompt` and `max_age`, shows the consent screen for an application that
   needs one, and only then issues the application's authorization code.

Step 5 is worth knowing about, because it means a federated login is not a
shortcut around the login page. The application receives its code from the
same place an ordinary login delivers it, and the person sees the same consent
screen.

## Accounts

**A first login creates a new user.** Authup does not match an external
identity to an existing account by email address, since anyone who can control
an email claim at the provider could otherwise take over an account.

**An existing account is linked by its owner.** A signed-in person links a
provider from the account console under **Connected accounts**. From then on,
signing in through that provider signs them in to that account.

An administrator can see and remove links (a user's **Identity provider
accounts** tab) but cannot create one, for the same reason.

## Multi-factor authentication

**The provider is the authentication authority, so Authup does not ask for a
second factor of its own on top of a federated login.** Configure and enforce
MFA at the provider. `mfaRequired` does not force local enrollment on people
who sign in this way either.

This is the same default Keycloak and Authentik ship, and it follows from how
accounts are linked: a person reaches an existing Authup account through a
provider only if they linked it while signed in, so the route was their choice.

There is one exception. An application can request a proof explicitly by
sending `acr_values=urn:authup:mfa` with its authorization request. Then Authup
challenges a factor the person holds before issuing that application's code,
whichever way they signed in.

The tokens say what happened: `amr` is `["ext"]` for a federated login, and
carries `"otp"` with `acr: urn:authup:mfa` when a factor was verified. A
federated login that verified no local factor carries no `acr` at all, because
Authup checked no credential of its own.

### Verifying what the provider did

"MFA is enforced at the provider" is a statement you make, and by default
Authup takes it on faith: an upstream that lets someone in with a password
alone is accepted, and nothing notices. Two optional fields on an OAuth2/OIDC
provider turn the assumption into a check on the claims that provider's own
token carries.

- **Required amr claim(s)** accepts the login when the provider's `id_token`
  carries any one of the listed values in its `amr` claim.
- **Required acr value(s)** accepts it when the token's `acr` is one of the
  listed values. Authup also sends these as `acr_values` on the authorize
  request, so the provider is asked to step up rather than only observed.

Both take a comma- or space-separated list and are empty by default, which is
the unchecked behaviour above. The vocabularies belong to the provider, so the
values do too: Keycloak and Authentik commonly answer `amr: ["mfa"]` or an
`acr` level of your own configuring, Entra ID answers `amr: ["pwd", "mfa"]`.
Read the provider's documentation, or sign in once and look at the `amr` and
`acr` in its token. Another Authup upstream answers `acr: urn:authup:mfa` once
a second factor was verified, so `urn:authup:mfa` is the value to require
there.

Set either one and the check fails closed. A login is refused when the claim
is missing, when it does not match, and when the provider returns no
`id_token` at all - which is what a provider configured as plain `oauth2`, or
an OIDC one whose scope no longer asks for `openid`, will do. The person is
returned to the login page; the reason is in the Authup server log, because
the login page deliberately says nothing about why a provider was refused.

The check also covers connecting an account from the account console, since
that admits an external identity to an account that already exists.

One caveat, and it applies to every provider field rather than just these two:
an update that omits a field clears it. A script that rotates the client secret
by sending only the fields it cares about will drop the allow-lists with
everything else it left out, and logins go back to being unchecked. Send the
whole provider, which is what the admin console does.

See [MFA configuration](../deployment/configuration-server-core-mfa.md) for the
server settings.

## Configuring a provider

For an OAuth2 or OpenID Connect provider you need, from that provider:

- the authorize and token URLs (an OpenID provider usually publishes them in
  its discovery document),
- a client id and client secret registered there for Authup,
- the scopes to request.

And at the provider, Authup's callback URL must be registered as a valid
redirect URI:

```text
<publicUrl>/identity-providers/<provider-id>/authorize-in
```

The provider id is shown on the provider's detail page in the admin console.

## Troubleshooting

**"The login request is unknown or expired."** The browser did not present the
cookie that was set when the login started, or it did and the login had already
been completed or had expired (five minutes). A browser that blocks all cookies
cannot sign in through a provider at all: the cookie is what ties the login to
the browser that began it, so that a link someone else opens cannot sign them
into the wrong account. Starting the login again is the fix.

**Two federated logins started in the same browser at once.** Only the most
recent one can be completed; the other returns to the login page and has to be
started again. The pending login is held in a single cookie per browser.

**The person lands back on the login page with no message.** The application's
authorization request no longer verifies: the client was deactivated or
deleted, its `redirect_uri` no longer matches a registered pattern, or a scope
was removed. The login page re-renders the same request, so it states the
reason itself.

**"The identity provider is not available."** The provider was disabled while
the person was away at it.

**Access was denied.** Either the person's Authup user is inactive, or the
application carries an access policy that the person does not satisfy.

**The provider says the redirect URI is invalid.** The callback URL above is
not registered at the provider, or `publicUrl` does not match the address the
browser actually reaches Authup on.
