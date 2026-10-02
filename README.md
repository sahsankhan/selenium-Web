# Selenium web

One browser journey against [Toolshop](https://practicesoftwaretesting.com), the same store used by the Playwright BDD and Cypress BDD projects.

1. Open the register page and create a new customer.
2. Sign in with that account.
3. Check the account menu is visible.

Each run uses a new email, because the shared demo customer is often locked.

## Setup

```powershell
cd selenium-web
npm install
```

Chrome must be installed. Selenium Manager downloads the matching driver.

## Run

```powershell
npm test
npm run report
```

By default this uses the public site. Point it at a local Toolshop instead:

```powershell
$env:UI_BASE_URL="http://localhost:4200"; npm test
```

The HTML summary is `reports/index.html`. A failure screenshot is `reports/screenshots/login-failure.png`.

## CI

GitHub Actions starts Toolshop with Docker Compose and runs the journey against `http://localhost:4200`. The public site is not used in CI, because Cloudflare challenges datacenter IPs and that breaks register-then-login.
