# OAuth Client Certificates

Authup supports two independent uses of a TLS client certificate:

| Client setting | Purpose | Certificate trust requirement |
|---|---|---|
| `auth_method: tls` | Authenticates the OAuth client at `/token` instead of a shared secret | Must chain to an enabled trust anchor in the client's realm |
| `token_binding_method: tls` | Binds issued tokens to the certificate so a copied token is unusable by itself | Any currently valid non-CA certificate, including self-signed |

You can enable either setting or both. TLS authentication does not
automatically bind tokens, and token binding does not automatically make the
certificate a trusted client identity.

This release consumes certificates issued by an external PKI. Authup-managed
CSR signing and generated client bundles are not part of this release.

## Configure a client

Open the client in the admin UI and choose:

- **Authentication method:** `None`, `Shared secret`, or `TLS certificate`.
- **Token binding:** `Disabled` or `TLS certificate`.

The API fields are:

```json
{
  "auth_method": "tls",
  "token_binding_method": "tls"
}
```

The authentication methods are exclusive. A `tls` client must not send a
secret, and a `secret` client cannot fall back to a certificate. Switching
away from `secret` permanently clears the stored secret and its hash/encryption
flags. Generate a new secret if you later switch back.

`client_credentials` requires an authenticated client, so it accepts `secret`
and `tls` clients but not `none` clients.

## Certificate identity for TLS authentication

After the client has been created, its detail form displays a stable URI:

```text
urn:authup:client:<client-uuid>
```

The external CA must put that exact value in a URI Subject Alternative Name
(SAN). For example:

```text
URI:urn:authup:client:26f7b5ea-50af-46ac-98aa-2735ea3f5639
```

The certificate may contain DNS names or other SANs. It must contain exactly
one URI SAN in the `urn:authup:client:` namespace, and that URI must match the
requested client's UUID. Mutable client and realm names are deliberately not
certificate identities.

For `auth_method: tls`, Authup also checks:

- the leaf and every selected issuer are currently valid;
- the leaf is not a CA certificate;
- the chain signatures, CA basic constraints, path-length constraints, and
  issuer key usage;
- `clientAuth` extended key usage when an EKU extension is present; and
- `digitalSignature` when a key-usage extension is present.

The chain must end at an enabled [trust anchor](./trust-anchors.md) in the
client's realm. Authup performs no AIA, CRL, or OCSP network fetch during a
request. Prefer short-lived client certificates. To stop trusting all
certificates issued below a compromised CA, disable its trust anchor and revoke
existing sessions/tokens separately.

## Token binding

With `token_binding_method: tls`, Authup places the presented leaf
certificate's SHA-256 DER thumbprint in each access and refresh token:

```json
{
  "cnf": {
    "x5t#S256": "base64url-sha256-thumbprint"
  }
}
```

Authup's own API and the `server-adapter-*` packages compare that signed value
with trusted certificate evidence on every protected request. They do not
repeat chain validation at the resource server.

A refresh request must present the same certificate again. The refresh token
is proof of the grant, while the TLS certificate proves that the caller still
holds the private key to which the grant was bound. Sending only the refresh
token would turn it back into a transferable bearer credential. Rotation
preserves the same `cnf` claim on the replacement access and refresh tokens.

For binding without TLS authentication, a self-signed or otherwise untrusted
leaf is valid. Trust is unnecessary because the certificate is not being used
to decide which client is calling; its thumbprint is only the
proof-of-possession key identifier. The proxy must still attest that the
certificate came from the TLS handshake.

## Requests

Use a real TLS client certificate and private key with the public proxy. Do not
construct Authup's forwarding headers in application code:

```bash
curl --cert client.crt --key client.key \
  --data-urlencode grant_type=client_credentials \
  --data-urlencode client_id=26f7b5ea-50af-46ac-98aa-2735ea3f5639 \
  https://mtls.auth.example.com/token
```

For TLS authentication, send `client_id` without `client_secret`. A Basic
authorization header counts as secret authentication and is rejected for a
TLS client.

Present the same certificate when using a bound access or refresh token:

```bash
curl --cert client.crt --key client.key \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://mtls.auth.example.com/users/@me

curl --cert client.crt --key client.key \
  --data-urlencode grant_type=refresh_token \
  --data-urlencode refresh_token="$REFRESH_TOKEN" \
  --data-urlencode client_id=26f7b5ea-50af-46ac-98aa-2735ea3f5639 \
  https://mtls.auth.example.com/token
```

When `CERTIFICATE_SOURCE` is enabled, the OpenID provider metadata advertises
`tls_client_auth` and certificate-bound token support. If `MTLS_PUBLIC_URL` is
configured, it also publishes `mtls_endpoint_aliases` so clients can select
the certificate-requesting origin automatically. Disabled deployments do not
advertise certificate features they cannot accept.

## Trusted proxy requirement

Authup's Node listener remains HTTP behind the load balancer. The configured
proxy requests the certificate during the TLS handshake, removes any
certificate headers supplied by the public caller, and writes one authenticated
header contract to the private backend request.

`CERTIFICATE_SOURCE` is disabled by default and accepts exactly one of:

- `standard`: RFC 9440 `Client-Cert` and optional `Client-Cert-Chain` headers;
- `forwarded`: one URL-escaped PEM leaf in
  `X-Forwarded-Tls-Client-Cert`; or
- `disabled`: ignore all certificate headers.

Authup never falls back between these header families. The backend port must
not be reachable by public clients; otherwise an attacker could forge the
header and impersonate a certificate holder.

The native NGINX and Traefik forwarded formats carry only the leaf. In
`forwarded` mode, a TLS-authentication leaf must therefore be signed directly
by an enabled realm trust anchor. Use `standard` mode and
`Client-Cert-Chain` when the PKI requires intermediate certificates.

See the [NGINX](../deployment/nginx.md) and
[Traefik](../deployment/traefik.md) deployment examples.
