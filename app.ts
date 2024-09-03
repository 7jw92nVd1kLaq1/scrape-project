import Hero from "@ulixee/hero-playground";
import fs from "fs";

(async () => {
  const hero = new Hero({
    blockedResourceTypes: [
      'BlockCssResources',
      'BlockFonts',
      'BlockImages',
      'BlockMedia',
    ]
  });

  try {
    await hero.goto("https://www.nba.com/game/atl-vs-chi-1522400055/game-charts");
    const title = await hero.document.title;
    console.log("Title:", title);

    const consentButton = hero.querySelector('body > div.fc-consent-root > div.fc-dialog-container > div.fc-dialog.fc-choice-dialog > div.fc-footer-buttons-container > div.fc-footer-buttons > button.fc-button.fc-cta-consent.fc-primary-button');
    await hero.waitForElement(consentButton, {
      timeoutMs: 30000,
    });
    if (consentButton) {
      await consentButton.click();
    }

    const boxScore = hero.querySelector("#box-score");
    await hero.waitForElement(boxScore, {
      timeoutMs: 30000,
    });
    await boxScore.click();

    const sectionElement = hero.querySelector('section[class^="GameBoxscore_gbTableSection"]');
    await hero.waitForElement(sectionElement, {
      timeoutMs: 30000,
    });

    const trElements = sectionElement.querySelectorAll("tr");
    console.log("Number of tr elements:", await trElements.length);

    await trElements.forEach(async (trElement) => {
      const tdElements = trElement.querySelectorAll("td");
      let rowText = "";
      await tdElements.forEach(async (tdElement) => {
        rowText += await tdElement.textContent + " | ";
      });
      console.log(rowText);
    });
    fs.writeFileSync("box-score.html", await hero.document.documentElement.outerHTML);
  } catch (error) {
    // save the page to a file for debugging using fs
    const pageContent = await hero.document.documentElement.outerHTML;
    fs.writeFileSync("error-page.html", pageContent);
    console.error("An error occurred while scraping the page:", error);
  }
  await hero.close();
})();