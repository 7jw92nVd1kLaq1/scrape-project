import Hero, { ISuperNode } from "@ulixee/hero-playground";
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

const extractTeamScores = async (teamStatsElement: ISuperNode) => {
  const teamScores : Array<Array<string | null>> = [];

  const scores = teamStatsElement.querySelectorAll("tbody > tr");
  await scores.forEach(async (scoreElement, index) => {
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
  await playerStats[0].$waitForExists(
    {
      timeoutMs: 5000,
    }
  );
  await playerStats.forEach(async (statElement, index) => {
    stats[statsHeader[index]] = await statElement.textContent || "";
  });

  return stats;
};

(async () => {
  const hero = new Hero();

  try {
    await hero.goto("https://www.nba.com/game/atl-vs-chi-1522400055");
    const title = await hero.document.title;
    console.log("Title:", title);

    const consentButton = hero.querySelector('body > div.fc-consent-root > div.fc-dialog-container > div.fc-dialog.fc-choice-dialog > div.fc-footer-buttons-container > div.fc-footer-buttons > button.fc-button.fc-cta-consent.fc-primary-button');
    try {
      await hero.waitForElement(consentButton, {
        timeoutMs: 10000,
      });
      if (consentButton) {
        await consentButton.click();
      }
    } catch (error) {
      console.error("Consent button not found");
    }

    // extract scores
    const summary = hero.querySelector("table[class^='GameLinescore_table']");
    await hero.waitForElement(summary, {
      timeoutMs: 5000,
    });
    const scores = await extractTeamScores(summary);
    console.log("Scores:", scores);

    // Click on the box score tab
    const boxScore = hero.querySelector("#box-score");
    await hero.waitForElement(boxScore, {
      timeoutMs: 30000,
    });
    await boxScore.click();

    const sectionElements = hero.querySelectorAll('section[class^="GameBoxscore_gbTableSection"]');
    await hero.waitForElement(sectionElements[0], {
      timeoutMs: 30000,
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

    console.log("Game stats:", gameStats);
    fs.writeFileSync("game-stats.json", JSON.stringify(gameStats, null, 2));
  } catch (error) {
    // save the page to a file for debugging using fs
    const pageContent = await hero.document.documentElement.outerHTML;
    fs.writeFileSync("error-page.html", pageContent);
    console.error("An error occurred while scraping the page:", error);
  }
  await hero.close();
})();