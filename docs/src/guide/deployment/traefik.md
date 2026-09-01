# Traefik

Traefik can terminate TLS, request a client certificate, and forward the
handshake certificate to Authup. Authup then owns realm-specific chain and
client-identity validation.

This example uses Traefik's native `passTLSClientCert.pem` output and Authup's
`forwarded` source:

```dotenv
CERTIFICATE_SOURCE=forwarded
MTLS_PUBLIC_URL=https://mtls.auth.example.com
```

```yaml
# Traefik dynamic configuration
http:
  routers:
    authup-mtls:
      rule: Host(`mtls.auth.example.com`)
      service: authup
      middlewares:
        - authup-client-certificate
      tls:
        options: authup-client-certificate

  middlewares:
    authup-client-certificate:
      passTLSClientCert:
        pem: true

  services:
    authup:
      loadBalancer:
        servers:
          - url: http://authup:3000

tls:
  options:
    authup-client-certificate:
      clientAuth:
        # Request a certificate without making Traefik's CA store the
        # authorization source. Authup validates TLS-authentication chains
        # against the client's realm trust anchors.
        clientAuthType: RequestClientCert
```

Use `RequireAnyClientCert` on a dedicated router if every request through that
hostname must carry a certificate. `RequestClientCert` is useful when the same
host must also accept ordinary secret/public OAuth clients; Authup still fails
closed when a particular client or token requires certificate evidence.

The middleware writes the URL-escaped PEM leaf to
`X-Forwarded-Tls-Client-Cert`. Do not expose the Authup backend service outside
the private container/Kubernetes network, and ensure no second route reaches
it while preserving a caller-supplied certificate header.

::: danger Native forwarded mode has no intermediate chain

Traefik's PEM option forwards the leaf certificate, not the complete chain.
With `CERTIFICATE_SOURCE=forwarded`, an `authMethod: tls` leaf must be signed
directly by an enabled trust anchor in the client's realm.

If your PKI issues through intermediates, use a gateway that emits RFC 9440
`Client-Cert` plus `Client-Cert-Chain` and configure
`CERTIFICATE_SOURCE=standard`.

:::

Traefik should request, not authorize, the certificate. Do not duplicate every
realm trust anchor into Traefik: that creates two trust stores with different
reload and realm semantics. For the complete client configuration and token
behavior, see [OAuth Client Certificates](../user/client-certificates.md).
