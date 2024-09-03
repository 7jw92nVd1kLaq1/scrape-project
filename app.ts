import Hero, { ISuperNode } from "@ulixee/hero-playground";
import fs from "fs";


interface IPlayerStats {
  [key: string]: string;
}


const extractPlayerName = async (playerElement: ISuperNode) => {
  const playerNameElement = playerElement.querySelector("span[class^='GameBoxscoreTablePlayer_gbpNameFull']");
  const playerName = await playerNameElement.textContent || "";
  return playerName;
};

const extractPlayerStats = async (playerElement: ISuperNode) => {
  const statsHeader = ["min", "fgm", "fga", "fg%", "3pm", "3pa", "3p%", "ftm", "fta", "ft%", "oreb", "dreb", "reb", "ast", "stl", "blk", "to", "pf", "pts", "+/-"];
  const stats : IPlayerStats = {
    min: "",
    fgm: "",
    fga: "",
    'fg%': "",
    '3pm': "",
    '3pa': "",
    '3p%': "",
    ftm: "",
    fta: "",
    'ft%': "",
    oreb: "",
    dreb: "",
    reb: "",
    ast: "",
    stl: "",
    blk: "",
    to: "",
    pf: "",
    pts: "",
    '+/-': "",
  };

  const playerStats = playerElement.querySelectorAll("td[class^='GameBoxscoreTable_stat']");
  await playerStats.forEach(async (statElement, index) => {
    stats[statsHeader[index]] = await statElement.textContent || "";
  });

  return stats;
};

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

    const sectionHeaders = sectionElement.querySelectorAll('thead[class^="StatsTableHead_thead"] > tr > th');
    await hero.waitForElement(sectionHeaders[0], {
      timeoutMs: 30000,
    });
    let headerText = "";
    await sectionHeaders.forEach(async (header) => {
      headerText += await header.textContent + " | ";
    });
    console.log(headerText);

    const trElements = sectionElement.querySelectorAll("tr");
    console.log("Number of tr elements:", await trElements.length);

    await trElements.forEach(async (trElement) => {
      const playerName = await extractPlayerName(trElement);
      if (!playerName) {
        return;
      }
      const playerStats = await extractPlayerStats(trElement);
      playerStats.playerName = playerName;
      console.log(playerStats);
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