# Trust Anchors (Trusted CAs)

A **trust anchor** is a CA certificate that you explicitly choose to trust.
It is the point where certificate-chain validation stops: a certificate is
trusted only when its chain can be verified back to an enabled trust anchor.

A trust anchor is therefore both:

- a public X.509 CA certificate; and
- an administrative trust decision for one Authup realm.

The certificate alone contains no secret. The CA private key remains with the
CA and must never be uploaded as a trust anchor.

Authup consumes enabled anchors when an OAuth client uses
`authMethod: tls`. Adding an anchor alone does not turn clients into TLS
clients; configure the client and trusted proxy separately. See
[OAuth Client Certificates](./client-certificates.md).

## How certificate trust works

A client normally holds a leaf certificate and its private key. A CA signs the
leaf certificate, possibly through one or more intermediate CAs:

```text
client certificate -> intermediate CA -> trusted CA
                                           ^
                                           |
                                    Authup trust anchor
```

The client proves possession of its private key during the TLS handshake.
Certificate-chain validation then establishes whether the presented public
certificate was issued by a CA that the realm trusts. Client identity checks,
such as matching a URI SAN to an OAuth client, are a separate step; a valid
chain alone does not identify which Authup client is connecting.

A trust anchor does not have to be a self-signed root CA. Trusting a dedicated
intermediate CA can be safer because it limits trust to certificates issued
under that intermediate.

## Intended use cases

Trust anchors are intended for certificate-based machine authentication, in
particular:

- **OAuth 2.0 mTLS client authentication:** authenticate a client at the token
  endpoint using a certificate issued by a trusted organizational or partner
  CA.
- **Externally issued client certificates:** use certificates from an existing
  internal PKI without importing CA private keys into Authup.
- **Partner-specific trust:** trust different partner or workload CAs in
  different realms.
- **CA rotation:** enable old and new CA certificates during a migration, then
  disable the old anchor after all client certificates have been replaced.
- **Certificate-bound access tokens:** prevent a copied access or refresh token
  from being used without the corresponding client certificate and private
  key. Token binding is independently configurable and does not itself require
  a trust anchor.

Use a dedicated client-authentication CA or intermediate with a narrow issuance
policy. Avoid adding a broad public Web PKI root merely because it is already
widely trusted: that greatly expands the population of certificates that can
reach the later identity-validation step.

## What a trust anchor is not

Several certificate-related objects serve different purposes:

| Object | Purpose | Private key in Authup? |
|---|---|---|
| **Trust anchor** | Validates client-certificate chains for one realm | No |
| **Client certificate** | Identifies a client and proves possession during mTLS | No; the client keeps it |
| **Authup signing key** | Signs Authup tokens; may publish an attached certificate through JWKS | Yes, for signing |
| **NGINX server certificate** | Identifies the HTTPS endpoint to browsers and clients | No; NGINX keeps it |

In particular, do not add the following as trust anchors:

- the HTTPS server certificate used by NGINX;
- a normal client leaf certificate;
- an Authup token-signing certificate or public key; or
- a CA certificate whose operator and issuance policy you do not intentionally
  trust for client authentication.

Self-signed client-certificate **authentication** is a different mode and is
not supported by `authMethod: tls`; authentication must chain to a realm
anchor. A self-signed leaf can still be used for binding-only proof of
possession when `tokenBindingMethod: tls`.

## Realm scope and lifecycle

Trust anchors are realm-scoped. An anchor configured in one realm does not
grant trust in another realm.

Each entry has:

- **Name:** a stable administrative identifier, unique inside the realm.
- **Certificate:** a PEM-encoded CA certificate or CA chain. The first
  certificate must be a CA certificate (`CA:TRUE`).
- **Enabled:** whether future certificate consumers may use the anchor.

The certificate is immutable. To replace it, create the replacement anchor and
then disable or delete the old entry. This makes CA rotation explicit and
allows an overlap period.

To manage anchors in the admin UI:

1. Select the target realm.
2. Open **Trusted CAs** in the sidebar. The API and domain model call these
   trust anchors.
3. Add the PEM-encoded CA certificate and choose a descriptive name.
4. Leave the anchor enabled only while that CA should be trusted.

Trust-anchor administration uses the same `KEY_*` permissions as key
management. Realm administrators can manage anchors only in their own realm.

## NGINX and private backend networks

In the intended production topology, NGINX or another load balancer terminates
HTTPS/mTLS. Authup remains reachable only through the private container or
Kubernetes network:

```text
client -- HTTPS/mTLS --> NGINX -- private HTTP --> Authup
                         |                         |
                         | forwards certificate   | validates against
                         | evidence                | realm trust anchors
```

The responsibilities are separate:

- NGINX owns the TLS connection and proves that certificate evidence came from
  the handshake.
- Authup owns the realm-specific CA-chain and OAuth client-identity checks.
- The Authup listener must not be publicly reachable, because public callers
  must not be able to inject forwarded-certificate headers directly.
- The proxy must remove or overwrite certificate headers received from the
  public request, including requests where no client certificate was
  negotiated.

Trust anchors do not configure NGINX automatically and are not a replacement
for the HTTPS server certificate installed at NGINX. See the
[NGINX](../deployment/nginx.md) or
[Traefik](../deployment/traefik.md) forwarding configuration.

## When you do not need trust anchors

You do not need a trust anchor for ordinary OAuth clients using `none` or a
shared secret, nor for binding-only certificates. You also do not need one
merely to serve Authup over HTTPS or to publish token-signing certificates
through JWKS.
