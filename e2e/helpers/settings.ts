import type { Page } from "@playwright/test";

import { expect } from "./fixtures";

/** Opens the settings dialog from the nav bar menu on the given section */
export const openSettings = async (page: Page, menuItem: string) => {
  const dialog = page.getByRole("dialog", { name: "Settings", exact: true });
  // Under load a click on the menu can land before its popup settles and be dropped, so retry the pick.
  // A dialog still animating in reads as hidden while its mask blocks the button, so that click times out too.
  await expect(async () => {
    if (!(await dialog.isVisible())) {
      await page.getByRole("button", { name: "Menu", exact: true }).click({ timeout: 2000 });
      await page.getByRole("menuitem", { name: menuItem, exact: true }).click({ timeout: 2000 });
    }
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  return dialog;
};
