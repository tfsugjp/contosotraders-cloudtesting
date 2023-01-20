// Test page content like button click and page redirection
import { test, expect } from '@playwright/test';

let _productid = 1;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
})

//#region Uncomment below lines to run dark mode tests
// test.describe('Dark Mode', () => {
//   test('shows page in dark mode', async ({ page }) => {
//     await page.locator('input.MuiSwitch-input').check()
//     await expect(page.locator('.App')).toHaveAttribute('class', 'App dark')
//   })
// });
//#endregion

test('Test with geolocation', async ({ page, context, request }) => {
  const ipTest = await request.get(`${process.env.REACT_APP_GEOLOCATIONAPI}`);
  expect(ipTest.status()).toBe(200);
  expect(ipTest.ok()).toBeTruthy();
  const location = JSON.parse(await ipTest.text())

  const latitude = location.latitude//await page.locator('input#latitude').inputValue();
  const longitude = location.longitude//await page.locator('input#longitude').inputValue();
  const point = latitude + ',' + longitude;
  const response = await request.get(`${process.env.REACT_APP_GEOAPIBASEURL}/Locations/${point}?key=${process.env.REACT_APP_BINGMAPSKEY}`);
  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();
  if (latitude != null && longitude != null) {
    await context.setGeolocation({ longitude: parseFloat(longitude), latitude: parseFloat(latitude) });
  }
  await Promise.all([
    page.waitForSelector('#current-location'),
  ]);
});

test.describe('Header', () => {
  test('should be able to search by text', async ({ page }) => {
    await page.getByPlaceholder('Search by product name or search by image').click();
    await page.getByPlaceholder('Search by product name or search by image').fill('laptops');
    await page.getByPlaceholder('Search by product name or search by image').press('Enter');
    await expect(page).toHaveURL('/suggested-products-list');
  });

  test('should be able to select category', async ({ page }) => {
    await page.getByRole('button', { name: 'All Categories' }).click();
    await page.getByRole('menuitem', { name: 'Laptops' }).click();
    await expect(page).toHaveURL('/list/laptops');
  });

  test('Hover over header menus', async ({ page }) => {
    await page.getByRole('navigation').getByRole('link', { name: 'All Products' }).hover();
    await page.getByRole('navigation').getByRole('link', { name: 'Laptops' }).hover();
    await page.getByRole('navigation').getByRole('link', { name: 'Controllers' }).hover();
    await page.getByRole('navigation').getByRole('link', { name: 'Mobiles' }).hover();
    await page.getByRole('navigation').getByRole('link', { name: 'Monitors' }).hover();
  });

  test('should be able to select header menu', async ({ page }) => {
    await page.getByRole('navigation').getByRole('link', { name: 'All Products' }).click();
    await expect(page).toHaveURL('/list/all-products');
  });

});

test.describe('Home page', () => {
  //Corousel
  test('should be able to select buy now in corosel', async ({ page }) => {
    await page.getByRole('button', { name: 'Buy Now' }).click();
    await expect(page).toHaveURL('/product/detail/' + _productid);
  });
  test('should be able to select more details in corosel', async ({ page }) => {
    await page.getByRole('button', { name: 'More Details' }).click();
    await expect(page).toHaveURL('/list/controllers');
  });

  //Banner
  test('should be able to click start shopping', async ({ page }) => {
    await page.locator('section').getByRole('button', { name: 'Start Shopping' }).click();
    await expect(page).toHaveURL('/list/controllers');
  });
  test('should be able to explore other products', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Other Products' }).click();
    await expect(page).toHaveURL('/list/laptops');
  });
  test('should be able to start shopping in footer', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Shopping' }).nth(1).click();
    await expect(page).toHaveURL('/list/controllers');
  });
});

test.describe('Product Listing', () => {
  test('should be able to select product to view details', async ({ page }) => {
    await page.goto('/list/all-products');
    await page.locator('.MuiGrid-root > .MuiPaper-root').first().click();
    await expect(page).toHaveURL('/product/detail/' + _productid);
  });
  test('should be able to filter product by brands', async ({ page }) => {
    await page.goto('/list/all-products');
    await page.locator('[id="\\32 "]').check();
  });
});

test.describe('Footer', () => {
  test('should be able to select footer menu', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: 'Monitors' }).getByRole('link', { name: 'Monitors' }).click();
    await expect(page).toHaveURL('/list/monitors');
  });
});