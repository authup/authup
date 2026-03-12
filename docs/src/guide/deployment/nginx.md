# Nginx
To configure nginx as a reverse proxy,
we need to create a new file (e.g. `app`) in the directory `/etc/nginx/sites-enabled`.

::: warning Info
Don't forget to replace the placeholders with the actual values:
- `[DOMAIN]` Domain name (e.g. app.example.com)
- `[CLIENT_WEB_PORT]`: Port of the client web application.
- `[SERVER_CORE_PORT]`: Port of the server core application.
:::

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
        proxy_read_timeout          1m;
        proxy_connect_timeout       1m;
        proxy_pass                          http://127.0.0.1:[CLIENT_WEB_PORT];
    }
    
    location /api/ {
        rewrite ^/api(/.*)$ $1 break;

        proxy_redirect                      off;
        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_read_timeout          2m;
        proxy_connect_timeout       2m;
        proxy_pass                          http://127.0.0.1:[SERVER_CORE_PORT];
    }
}
```

## Certificate

The easiest way to set up a certificate is with the help of certbot. On a Linux based system, letsencrypt can be installed with the following command.

```shell
sudo apt install certbot python3-certbot-nginx
```

A certificate can be requested and installed with the following command.

```shell
sudo certbot --nginx -d [DOMAIN]
```
