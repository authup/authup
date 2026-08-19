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

```
<publicUrl>/identity-providers/<provider-id>/authorize-in
```

The provider id is shown on the provider's detail page in the admin console.

## Troubleshooting

**"The login request is unknown or expired."** The browser did not present the
cookie the callback set, or it did and the login had already been completed or
had expired (five minutes). A browser that blocks all cookies cannot complete a
federated login. Starting the login again is the fix.

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
