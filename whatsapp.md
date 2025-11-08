Phase 1: Meta Setup (Prerequisites)

a) Create Meta App​​

Go to developers.facebook.com/apps

Create a new "Business" type app

Save the App ID

b) Configure Facebook Login for Business​

In your Meta App Dashboard:

Go to Facebook Login for Business > Setup

Create a new Configuration

For Login variation, select WhatsApp Embedded Signup

For Choose access token, select System-user access token (60-day expiration)

For Assets, keep WhatsApp accounts selected

For Permissions, select whatsapp_business_management only

Save and copy the Configuration ID (you'll need this)

c) Update Login Settings​

Still in App Dashboard, go to Facebook Login for Business > Settings:

Set these to Yes:

Client OAuth login

Web OAuth login

Enforce HTTPS

Embedded Browser OAuth Login

Use Strict Mode for redirect URIs

Login with the JavaScript SDK

Add your domain to:

Valid OAuth Redirect URIs

Allowed Domains for the JavaScript SDK

(Must use HTTPS, can't be wildcard URLs)

d) Create System User Token​​

This is critical for backend API calls:

In Meta Business Manager > Users > System Users

Create a new System User

Generate a token with permissions:

whatsapp_business_management

whatsapp_business_messaging

Save this token (you'll use it for all backend API calls)