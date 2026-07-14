# Reference: Keycloak

- **Project:** [keycloak/keycloak](https://github.com/keycloak/keycloak) — Red Hat's open-source IAM (Java).
- **Docs:** https://www.keycloak.org/documentation
- **Why referenced:** occasional design cross-checks (parity/posture comparisons); authup's primary
  parity target is Authentik (see `authentik.md`), Keycloak is consulted for OIDC/credential-storage
  precedent.
- **How to maintain:** when you look something up in Keycloak's docs/source during authup work, add
  or correct the mapping row here (cumulative). Pin claims to a version/date.

## Concept map (Keycloak → authup)

| Keycloak concept | authup counterpart | Behavioral differences / notes |
|---|---|---|
| User OTP secret storage: `CREDENTIAL` table, `SECRET_DATA` JSON column — **plaintext** (`{"value":"<seed>"}`; confirmed in [discussion #23207](https://github.com/keycloak/keycloak/discussions/23207), verified 2026-07-14) | `auth_user_authenticators.secret` — AES-256-GCM under env `MFA_ENCRYPTION_KEY` (`SymmetricCipher`, `select:false`) | authup encrypts TOTP seeds at rest; Keycloak does not (delegates to DB/disk encryption). |
| Realm keys (signing/encryption): generated per realm, private keys stored in `COMPONENT_CONFIG` — plaintext | `auth_keys.decryption_key` — plaintext base64, `select:false` only | Parity (both plaintext). Keycloak's own [secure-credentials-store design doc](https://github.com/keycloak/keycloak-community/blob/main/design/secure-credentials-store.md) lists realm keys, client secrets, LDAP/SMTP creds, IdP secrets, and user OTP secrets as "currently stored in plaintext". |
| Vault SPI (`${vault.key}` references) — **config-level secrets only** (SMTP password, LDAP bind credential, IdP client secrets); read-only lookup, shipped as Part I of the secure-credentials-store design | No vault indirection for config secrets; env/config values used directly | Part II of that design (an encryption/decryption SPI for DB-stored secrets, i.e. envelope encryption) was drafted but **never implemented** — Keycloak still stores user OTP secrets plaintext as of 2026. |
