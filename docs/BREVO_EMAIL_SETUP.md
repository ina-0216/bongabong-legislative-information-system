# Brevo Email Setup

Brevo provides an HTTPS transactional email API for the system. The municipality
should own the provider account and authorize the sender address and sending
domain. Choose a plan that meets expected municipal volume, and confirm its
current limits and branding terms before go-live.

## Create and verify the sender

1. Create a Brevo account using an email account managed by the municipality.
2. Complete any account review Brevo requires before enabling transactional sends.
3. In **Settings → Senders, domains & dedicated IPs → Senders**, add the sender
   address and complete the verification code sent to that mailbox. For
   municipal use, configure an authorized `bongabong.gov.ph` sender domain and
   complete its DNS authentication for deliverability.
4. Create a Brevo API key. Keep it private; do not commit it or paste it into
   source files, tickets, or chat.

## Configure the Render API

In the Render service's environment settings, add:

```text
EMAIL_PROVIDER=brevo
BREVO_API_KEY=<the private Brevo API key>
BREVO_SENDER_EMAIL=<the sender address verified in Brevo>
```

Save the settings and deploy/restart the API. The existing Resend credentials
can remain in Render; `EMAIL_PROVIDER=brevo` explicitly selects Brevo. Remove
the `EMAIL_PROVIDER` override to return to the existing Resend default when a
verified Resend domain is available.

## Verify delivery

Send an invitation to an address you control, then confirm the delivery in the
Brevo transactional email logs and in the recipient inbox. Once delivery works,
retry invitations for users who are still Pending from the admin user list.

Before municipal go-live, confirm the selected plan's sending limits, complete
sender-domain authentication, and keep the provider account and credentials
under municipal control.
