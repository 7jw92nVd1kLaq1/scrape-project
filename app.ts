import Hero, { ISuperNode, Tab } from "@ulixee/hero-playground";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from "fs";


interface IGameStats {
  homeTeam: ITeamStats;
  awayTeam: ITeamStats;
}

interface ITeamStats {
  teamName: string;
  scores: Array<null | string>;
  players: IPlayerStats[];
}

interface IPlayerStats {
  [key: string]: string;
}

const extractGameInfoFromTab = async (tab: Tab, url: string) => {
  try {
    await tab.goto(url);
    let title = await tab.document.title;
    if (title.includes("Error")) {
      await tab.goto(url);
      title = await tab.document.title;
    }

    if (title.includes("Error")) {
      throw new Error("Error loading the page");
    }

    // replace all spaces with underscores
    title = title.replace(/\s/g, "_");

    // Create a flow handler to handle the consent dialog automatically at any point in time
    await tab.registerFlowHandler("Consent", assert => {
      assert(tab.querySelector('body > div.fc-consent-root > div.fc-dialog-container > div.fc-dialog.fc-choice-dialog > div.fc-footer-buttons-container > div.fc-footer-buttons > button.fc-button.fc-cta-consent.fc-primary-button').$exists)
    },
    async error => {
      console.error("Consent button found");
      await tab.querySelector('body > div.fc-consent-root > div.fc-dialog-container > div.fc-dialog.fc-choice-dialog > div.fc-footer-buttons-container > div.fc-footer-buttons > button.fc-button.fc-cta-consent.fc-primary-button').$click();
    });
    /*
    const consentButton = tab.querySelector('body > div.fc-consent-root > div.fc-dialog-container > div.fc-dialog.fc-choice-dialog > div.fc-footer-buttons-container > div.fc-footer-buttons > button.fc-button.fc-cta-consent.fc-primary-button');
    try {
      await tab.waitForElement(consentButton, {
        timeoutMs: 5000,
      });
      await consentButton.click();
    } catch (error) {
      console.error("Consent button not found");
    }
    */

    // extract scores
    let scores : Array<Array<string | null>> = [];
    try {
      const summary = tab.querySelector("table[class^='GameLinescore_table']");
      await tab.waitForElement(summary, {
        timeoutMs: 5000,
      });
      scores = await extractTeamScores(summary);
    } catch (error) {
      console.error("Scores not found");
      throw error;
    }

    // Click on the box score tab
    try {
      const boxScore = tab.querySelector("#box-score");
      await tab.waitForElement(boxScore, {
        timeoutMs: 5000,
      });
      await boxScore.click();
    } catch (error) {
      console.error("Box score tab not found");
      throw error;
    }

    const sectionElements = tab.querySelectorAll('section[class^="GameBoxscore_gbTableSection"]');
    await tab.waitForElement(sectionElements[0], {
      timeoutMs: 5000,
    });
    let gameStats : IGameStats = {
      homeTeam: {
        teamName: "",
        scores: [],
        players: [],
      },
      awayTeam: {
        teamName: "",
        scores: [],
        players: [],
      },
    };

    await sectionElements.forEach(async (sectionElement, index) => {
      const teamStats = await extractTeamStats(sectionElement);

      if (index === 0) {
        gameStats.awayTeam = teamStats;
        gameStats.awayTeam.scores = scores[0];
      } else {
        gameStats.homeTeam = teamStats;
        gameStats.homeTeam.scores = scores[1];
      }
    });

    fs.writeFileSync(
      `${title}.json`, 
      JSON.stringify(gameStats, null, 2)
    );
  } catch (error) {
    // save the page to a file for debugging using fs
    const pageContent = await tab.document.documentElement.outerHTML;
    fs.writeFileSync("error-page.html", pageContent);
    console.error("An error occurred while scraping the page:", error);
  }
};


const extractTeamScores = async (teamStatsElement: ISuperNode) => {
  const teamScores : Array<Array<string | null>> = [];

  const scores = teamStatsElement.querySelectorAll("tbody > tr");
  await scores.forEach(async (scoreElement) => {
    const teamScoresPerQt = scoreElement.querySelectorAll("td");
    const score : Array<string | null> = [];
    await teamScoresPerQt.forEach(async (scoreElement) => {
      const scoreValue = await scoreElement.textContent;
      score.push(scoreValue);
    });
    teamScores.push(score);
  });

  return teamScores;
}

const extractTeamStats = async (teamStatsElement: ISuperNode) => {
  const teamName = await extractTeamName(teamStatsElement);
  if (!teamName) {
    throw new Error("Team name not found");
  }
  const teamStats : ITeamStats = {
    teamName,
    scores: [],
    players: [],
  }

  const playerStats = teamStatsElement.querySelectorAll("tr");
  await playerStats.forEach(async (trElement, index) => {
    if (index === 0) 
      return;

    const playerName = await extractPlayerName(trElement);
    const playerStats = await extractPlayerStats(trElement);
    playerStats.playerName = playerName; 
    teamStats.players.push(playerStats);
  });

  return teamStats;
};

const extractTeamName = async (teamElement: ISuperNode) => {
  try {
    const teamNameElement = teamElement.querySelector("h2[class^='GameBoxscoreTeamHeader']");
    if (!teamNameElement) {
      return "";
    }
    if (!await teamNameElement.$isVisible) {
      return "";
    }
    const teamName = await teamNameElement.textContent;
    if (!teamName) {
      return "";
    }
    return teamName;
  } catch (error) {
    console.error("Error extracting team name:", error);
    throw error;
  }
}

const extractPlayerName = async (playerElement: ISuperNode) => {
  try {
    const playerNameElement = playerElement.querySelector("span[class^='GameBoxscoreTablePlayer_gbpNameFull']");
    if (!playerNameElement) {
      return "";
    }
    if (!await playerNameElement.$isVisible) {
      return "";
    }
    const playerName = await playerNameElement.textContent;
    if (!playerName) {
      return "";
    }
    return playerName;
  } catch (error) {
    console.error("Error extracting player name:", error);
    throw error;
  }
};

const extractPlayerStats = async (playerElement: ISuperNode) => {
  const statsHeader = ["min", "fgm", "fga", "fg%", "3pm", "3pa", "3p%", "ftm", "fta", "ft%", "oreb", "dreb", "reb", "ast", "stl", "blk", "to", "pf", "pts", "+/-"];
  const stats : IPlayerStats = {};

  const playerStats = playerElement.querySelectorAll("td[class^='GameBoxscoreTable_stat']");
  if (!(await playerStats.length)) {
    return { ...stats };
  }
  await playerStats.forEach(async (statElement, index) => {
    stats[statsHeader[index]] = await statElement.textContent || "";
  });

  return stats;
};

(async () => {
  const hero = new Hero();
  const readlineInterface = readline.createInterface({
    input,
    output,
  });

  while (1) {
    const tabs = await hero.tabs;
    console.log(`Current number of tabs: ${tabs.length}`);
    const url = await readlineInterface.question("Enter the URL of the game: ");
    if (url === "exit") {
      break;
    }

    const newTab = await hero.newTab();
    console.log("New tab opened successfully");
    await extractGameInfoFromTab(newTab, url);
    console.log("Game stats extracted successfully");
    await newTab.close();
  }

  console.log("Exiting...");
  await hero.close();
})();