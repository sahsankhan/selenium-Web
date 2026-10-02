# Selenium web

One Chrome journey against [Toolshop](https://practicesoftwaretesting.com).

1. Open the register page and create a new customer.
2. Sign in with that account.
3. Check the account menu is visible.

Each run uses a new email, because the shared demo customer is often locked. Locally Chrome opens on screen. In CI it runs headless.

## Prerequisites

- Node.js 20+
- npm
- Google Chrome

Selenium Manager downloads the matching driver.

## Setup

```powershell
git clone https://github.com/sahsankhan/selenium-Web.git
cd selenium-Web
npm install
```

## Run

```powershell
npm test
```

`npm test` runs the journey and writes `reports/index.html`. Open that file, or run:

```powershell
npm run report
```

`npm run report` only opens the report from the last `npm test`. It does not run the test again.

By default the test uses the public site. Point it at a local Toolshop instead:

```powershell
$env:UI_BASE_URL="http://localhost:4200"
npm test
```

A failure screenshot is saved at `reports/screenshots/login-failure.png`.

## CI

GitHub Actions checks out [Toolshop](https://github.com/testsmith-io/practice-software-testing), starts it with Docker Compose, and runs the journey against `http://localhost:4200`. The public site is not used in CI, because Cloudflare challenges datacenter IPs and that breaks register-then-login.

The HTML report is uploaded as the `selenium-report` artifact.
