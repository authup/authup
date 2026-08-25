# Nginx
To configure nginx as a reverse proxy,
we need to create a new file (e.g. `app`) in the directory `/etc/nginx/sites-enabled`.

::: warning Info
Don't forget to replace the placeholders with the actual values:
- `[DOMAIN]` Domain name (e.g. app.example.com)
- `[SERVER_CORE_PORT]`: Port of the server core application.
:::

There is one upstream. `server/core` serves the API and both consoles (the
admin console at `/admin`, the account console at `/account`), so nothing has
to be routed by path.

```txt
map $sent_http_content_type $expires {
    "text/html"                 epoch;
    "text/html; charset=utf-8"  epoch;
    default                     off;
}

server {
    server_name [DOMAIN];
    listen 80;

    gzip            on;
    gzip_types      text/plain application/xml text/css application/javascript;
    gzip_min_length 1000;
    
    client_max_body_size 0;
    chunked_transfer_encoding on;

    location / {
        expires $expires;

        proxy_redirect                      off;
        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto  $scheme;
        # Clear the client-certificate header so a public request can never
        # spoof it. Only a trusted mTLS location (see below) may set it.
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_read_timeout          2m;
        proxy_connect_timeout       2m;
        proxy_pass                          http://127.0.0.1:[SERVER_CORE_PORT];
    }
}
```

## Sub-path deployment

Authup can live under a path prefix of a larger site. Strip the prefix in the
proxy and tell authup its public address, so the consoles rebase their asset
URLs and links onto it:

```nginx
location /auth/ {
    rewrite ^/auth(/.*)$ $1 break;

    proxy_set_header Host               $host;
    proxy_set_header X-Real-IP          $remote_addr;
    proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto  $scheme;
    proxy_set_header X-Forwarded-Tls-Client-Cert "";
    proxy_pass                          http://127.0.0.1:[SERVER_CORE_PORT];
}
```

```dotenv
PUBLIC_URL=https://[DOMAIN]/auth
```

The consoles are then reachable at `https://[DOMAIN]/auth/admin` and
`https://[DOMAIN]/auth/account`. Session cookies are scoped to the prefix, so
an application of your own on the same origin is left alone.

## Certificate

The easiest way to set up a certificate is with the help of certbot. On a Linux based system, letsencrypt can be installed with the following command.

::: tip Certificate roles

The certificate configured in this section identifies the NGINX HTTPS endpoint
to browsers and API clients. It is not an Authup client-certificate trust
anchor. See [Trust Anchors (Trusted CAs)](../user/trust-anchors.md) for the
difference and the mTLS topology.

:::

```shell
sudo apt install certbot python3-certbot-nginx
```

A certificate can be requested and installed with the following command.

```shell
sudo certbot --nginx -d [DOMAIN]
```

## TLS client certificates

The recommended topology uses a dedicated hostname that requests a client
certificate and routes to the same private Authup listener. Configure Authup:

```dotenv
CERTIFICATE_SOURCE=forwarded
MTLS_PUBLIC_URL=https://mtls.auth.example.com
```

Then add an NGINX server/location for that hostname:

```nginx
server {
    listen 443 ssl;
    server_name mtls.auth.example.com;

    ssl_certificate     /etc/letsencrypt/live/mtls.auth.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mtls.auth.example.com/privkey.pem;

    # Ask for a certificate but leave realm-specific trust decisions to Authup.
    # This also permits self-signed certificates used only for token binding.
    ssl_verify_client optional_no_ca;

    location / {
        proxy_pass http://127.0.0.1:[SERVER_CORE_PORT];
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Always derive this value from the current TLS handshake. Never pass
        # through a public request's header value.
        proxy_set_header X-Forwarded-Tls-Client-Cert $ssl_client_escaped_cert;
    }
}
```

If ordinary OAuth clients share the same hostname, `optional_no_ca` lets them
connect without a certificate; Authup rejects only requests whose client or
token configuration requires one. A separate mTLS hostname avoids browser
certificate prompts on the normal console origin and is published through
`mtls_endpoint_aliases` when `MTLS_PUBLIC_URL` is set.

The Authup listener must remain private. Any other proxy location that reaches
it must clear the forwarding header:

```nginx
proxy_set_header X-Forwarded-Tls-Client-Cert "";
```

::: danger Native forwarded mode has no intermediate chain

`$ssl_client_escaped_cert` contains the leaf certificate only. With
`CERTIFICATE_SOURCE=forwarded`, a client using `authMethod: tls` must have a
leaf signed directly by an enabled trust anchor in its realm.

For a root → intermediate → leaf PKI, use an ingress that emits RFC 9440
`Client-Cert` and `Client-Cert-Chain` and select
`CERTIFICATE_SOURCE=standard`.

:::

NGINX requests and attests the handshake certificate; Authup validates TLS
client-authentication chains against its live realm trust anchors. Do not copy
those realm trust anchors into a second authorization CA store in NGINX. See
[OAuth Client Certificates](../user/client-certificates.md) for client URI-SAN
and token-binding requirements.
