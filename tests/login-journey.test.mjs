import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { Builder, By, Select, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const uiBaseUrl = (process.env.UI_BASE_URL || 'https://practicesoftwaretesting.com').replace(/\/$/, '');

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

test('register on Toolshop then sign in', async (t) => {
  const account = uniqueAccount();
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions()).build();
  t.after(async () => {
    await driver.quit();
  });

  try {
    await driver.manage().window().setRect({ width: 1400, height: 1000 });
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

    await driver.get(`${uiBaseUrl}/auth/login`);
    await setField(driver, '[data-test="email"]', account.email);
    await setField(driver, '[data-test="password"]', account.password);
    await driver.findElement(By.css('[data-test="login-submit"]')).click();
    const menu = await driver.wait(until.elementLocated(By.css('[data-test="nav-menu"]')), 30000);
    await driver.wait(until.elementIsVisible(menu), 30000);
    assert.ok(await menu.isDisplayed());
  } catch (error) {
    const shotDir = path.resolve('reports', 'screenshots');
    await mkdir(shotDir, { recursive: true });
    const png = await driver.takeScreenshot();
    await writeFile(path.join(shotDir, 'login-failure.png'), Buffer.from(png, 'base64'));
    throw error;
  }
});
