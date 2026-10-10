import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { Builder, By, Select, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const uiBaseUrl = (process.env.UI_BASE_URL || 'https://practicesoftwaretesting.com').replace(/\/$/, '');
const apiBaseUrl = (process.env.API_BASE_URL || 'https://api.practicesoftwaretesting.com').replace(/\/$/, '');

function chromeOptions() {
  const options = new chrome.Options();
  if (process.env.CI) {
    options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage');
  }
  return options;
}

function uniqueAccount() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `qa.selenium.${stamp}@example.com`,
    password: `Hyb!${stamp}Qa#9`,
  };
}

async function setField(driver, selector, value) {
  const field = await driver.wait(until.elementLocated(By.css(selector)), 30000);
  await driver.wait(until.elementIsVisible(field), 30000);
  await driver.executeScript(
    `const el = arguments[0];
     const proto = Object.getPrototypeOf(el);
     const desc = Object.getOwnPropertyDescriptor(proto, 'value');
     desc.set.call(el, arguments[1]);
     el.dispatchEvent(new Event('input', { bubbles: true }));
     el.dispatchEvent(new Event('change', { bubbles: true }));
     el.dispatchEvent(new Event('blur', { bubbles: true }));`,
    field,
    value,
  );
}

async function inStockProduct() {
  const response = await fetch(`${apiBaseUrl}/products?page=1`);
  assert.equal(response.ok, true);
  const body = await response.json();
  const product = (body.data || []).find((item) => item.in_stock);
  assert.ok(product, 'in-stock product');
  return product;
}

async function withDriver(t, run) {
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions()).build();
  t.after(async () => {
    await driver.quit();
  });
  try {
    await driver.manage().window().setRect({ width: 1400, height: 1000 });
    await run(driver);
  } catch (error) {
    const shotDir = path.resolve('reports', 'screenshots');
    await mkdir(shotDir, { recursive: true });
    const png = await driver.takeScreenshot();
    const name = `${t.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    await writeFile(path.join(shotDir, name), Buffer.from(png, 'base64'));
    throw error;
  }
}

async function register(driver) {
  const account = uniqueAccount();
  await driver.get(`${uiBaseUrl}/auth/register`);
  await driver.wait(until.elementLocated(By.css('app-root')), 40000);
  await setField(driver, '[data-test="first-name"]', 'Selenium');
  await setField(driver, '[data-test="last-name"]', 'Tester');
  await setField(driver, '[data-test="dob"]', '1990-01-15');
  const country = await driver.findElement(By.css('[data-test="country"]'));
  await new Select(country).selectByValue('NL');
  await setField(driver, '[data-test="postal_code"]', '3511AB');
  await setField(driver, '[data-test="house_number"]', '12');
  await setField(driver, '[data-test="street"]', 'Test Street');
  await setField(driver, '[data-test="city"]', 'Utrecht');
  await setField(driver, '[data-test="state"]', 'Utrecht');
  await setField(driver, '[data-test="phone"]', '5550100123');
  await setField(driver, '[data-test="email"]', account.email);
  await setField(driver, '[data-test="password"]', account.password);
  const submit = await driver.findElement(By.css('[data-test="register-submit"]'));
  await driver.wait(until.elementIsEnabled(submit), 20000);
  await submit.click();
  await driver.wait(until.urlContains('login'), 30000);
  return account;
}

async function signIn(driver, account) {
  await driver.get(`${uiBaseUrl}/auth/login`);
  await setField(driver, '[data-test="email"]', account.email);
  await setField(driver, '[data-test="password"]', account.password);
  await driver.findElement(By.css('[data-test="login-submit"]')).click();
  const menu = await driver.wait(until.elementLocated(By.css('[data-test="nav-menu"]')), 30000);
  await driver.wait(until.elementIsVisible(menu), 30000);
}

async function addFirstProductToCart(driver) {
  const product = await inStockProduct();
  await driver.get(`${uiBaseUrl}/product/${product.id}`);
  const add = await driver.wait(until.elementLocated(By.css('[data-test="add-to-cart"]')), 30000);
  await driver.wait(until.elementIsVisible(add), 20000);
  await driver.wait(until.elementIsEnabled(add), 20000);
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', add);
  await add.click();
  await driver.wait(until.elementLocated(By.css('[data-test="nav-cart"]')), 20000);
  await driver.get(`${uiBaseUrl}/checkout`);
  return product.name;
}

test('catalog lists products', async (t) => {
  await withDriver(t, async (driver) => {
    await driver.get(`${uiBaseUrl}/`);
    const card = await driver.wait(until.elementLocated(By.css('[data-test="product-name"]')), 30000);
    await driver.wait(until.elementIsVisible(card), 30000);
    assert.ok((await card.getText()).trim().length > 0);
  });
});

test('in-stock product page is ready to buy', async (t) => {
  await withDriver(t, async (driver) => {
    const product = await inStockProduct();
    await driver.get(`${uiBaseUrl}/product/${product.id}`);
    const add = await driver.wait(until.elementLocated(By.css('[data-test="add-to-cart"]')), 30000);
    await driver.wait(until.elementIsVisible(add), 30000);
    const title = await driver.wait(until.elementLocated(By.css('[data-test="product-title"], h1')), 30000);
    assert.match(await title.getText(), new RegExp(product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('search finds an in-stock product', async (t) => {
  await withDriver(t, async (driver) => {
    const product = await inStockProduct();
    await driver.get(`${uiBaseUrl}/`);
    await driver.wait(until.elementLocated(By.css('app-root')), 40000);
    const search = await driver.wait(until.elementLocated(By.css('[data-test="search-query"]')), 60000);
    await driver.wait(until.elementIsVisible(search), 20000);
    await setField(driver, '[data-test="search-query"]', product.name);
    await driver.findElement(By.css('[data-test="search-submit"]')).click();
    const term = await driver.wait(until.elementLocated(By.css('[data-test="search-term"]')), 30000);
    assert.equal((await term.getText()).trim(), product.name);
    const listed = await driver.wait(until.elementLocated(By.css('[data-test="product-name"]')), 30000);
    assert.match(await listed.getText(), new RegExp(product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('new customer can register', async (t) => {
  await withDriver(t, async (driver) => {
    await register(driver);
    assert.match(await driver.getCurrentUrl(), /login/i);
  });
});

test('registered customer can sign in', async (t) => {
  await withDriver(t, async (driver) => {
    const account = await register(driver);
    await signIn(driver, account);
    const menu = await driver.findElement(By.css('[data-test="nav-menu"]'));
    assert.equal(await menu.isDisplayed(), true);
  });
});

test('wrong password is rejected', async (t) => {
  await withDriver(t, async (driver) => {
    await driver.get(`${uiBaseUrl}/auth/login`);
    await setField(driver, '[data-test="email"]', `nobody.${Date.now()}@example.com`);
    await setField(driver, '[data-test="password"]', 'WrongPassword!9');
    await driver.findElement(By.css('[data-test="login-submit"]')).click();
    const error = await driver.wait(until.elementLocated(By.css('[data-test="login-error"]')), 30000);
    await driver.wait(until.elementIsVisible(error), 30000);
    const menus = await driver.findElements(By.css('[data-test="nav-menu"]'));
    assert.equal(menus.length, 0);
  });
});

test('signed-in customer sees the product in the cart', async (t) => {
  await withDriver(t, async (driver) => {
    const account = await register(driver);
    await signIn(driver, account);
    const productName = await addFirstProductToCart(driver);
    const title = await driver.wait(until.elementLocated(By.css('[data-test="product-title"]')), 30000);
    assert.match(await title.getText(), new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('checkout with cash on delivery confirms the order', async (t) => {
  await withDriver(t, async (driver) => {
    const account = await register(driver);
    await signIn(driver, account);
    await addFirstProductToCart(driver);
    const proceedCart = await driver.wait(until.elementLocated(By.css('[data-test="proceed-1"]')), 20000);
    await driver.wait(until.elementIsVisible(proceedCart), 20000);
    await proceedCart.click();
    await driver.findElement(By.css('[data-test="proceed-2"]')).click();
    const country = await driver.wait(until.elementLocated(By.css('[data-test="country"]')), 30000);
    await new Select(country).selectByValue('NL');
    await setField(driver, '[data-test="postal_code"]', '3511AB');
    await setField(driver, '[data-test="house_number"]', '12');
    await setField(driver, '[data-test="street"]', 'Test Street');
    await setField(driver, '[data-test="city"]', 'Utrecht');
    await setField(driver, '[data-test="state"]', 'Utrecht');
    const proceed = await driver.findElement(By.css('[data-test="proceed-3"]'));
    await driver.wait(until.elementIsEnabled(proceed), 20000);
    await proceed.click();
    const payment = await driver.wait(until.elementLocated(By.css('[data-test="payment-method"]')), 30000);
    await new Select(payment).selectByValue('cash-on-delivery');
    const finish = await driver.findElement(By.css('[data-test="finish"]'));
    await driver.wait(until.elementIsEnabled(finish), 20000);
    await finish.click();
    const confirmation = await driver.wait(
      until.elementLocated(By.css('[data-test="payment-success-message"], #order-confirmation')),
      30000,
    );
    await driver.wait(until.elementIsVisible(confirmation), 30000);
  });
});
