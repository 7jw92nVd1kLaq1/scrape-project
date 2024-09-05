import Hero, { ISuperNode, Tab } from "@ulixee/hero-playground";
import fs from "fs";


interface ITeamInfo {
  teamName: string;
  url: string;
  players: IPlayerInfo[];
}

interface IPlayerInfo {
  playerName: string;
  playerUrl: string;
  annualStats?: IPlayerStats[];
  currentSeasonGamesStats?: IPlayerGameStats;
}

interface IPlayerStats {
  [key: string]: string;
}

interface IPlayerGameStats {
  [key: string]: string;
}

const extractAllTeamsUrl = async (tab: Tab) => {
  try {
    await tab.goto("https://www.basketball-reference.com/teams/");
    console.log(await tab.document.title);

    const teamTables = tab.querySelectorAll("#teams_active > tbody > tr > th > a");
    const teamUrls : ITeamInfo[] = [];

    await teamTables.forEach(async (team) => {
      const teamObj : ITeamInfo = {
        teamName: await team.innerText,
        url: `https://www.basketball-reference.com${await team.getAttribute("href")}`,
        players: [],
      };
      teamUrls.push(teamObj);
    });

    return teamUrls;
  } catch (error) {
    console.error(error);
    throw new Error("Error extracting all teams");
  }
};

const extractLatestSeasonUrl = async (tab: Tab, url: string) => {
  try {
    await tab.goto(url);

    const seasonRow = tab.querySelector("tbody > tr[data-row='0'] > th > a");
    await tab.waitForElement(seasonRow, {
      timeoutMs: 5000,
    });

    const seasonUrl = `https://www.basketball-reference.com${await seasonRow.getAttribute("href")}`;

    return seasonUrl;
  } catch (error) {
    console.error(error);
    throw new Error("Error extracting latest season");
  }
}

const extractPlayers = async (tab: Tab, url: string) => {
  try {
    await tab.goto(url);

    const playerTables = tab.querySelectorAll("#roster > tbody > tr > td[data-stat='player'] > a");
    const playerUrls : IPlayerInfo[] = [];

    await playerTables.forEach(async (player) => {
      const playerObj : IPlayerInfo = {
        playerName: await player.innerText,
        playerUrl: `https://www.basketball-reference.com${await player.getAttribute("href")}`,
      };
      playerUrls.push(playerObj);
    });

    return playerUrls;
  } catch (error) {
    console.error(error);
    throw new Error("Error extracting all players");
  }
};

const extractPlayerCareerStats = async (tab: Tab, url: string) => {
  try {
    await tab.goto(url);

    const statHeaders = tab.querySelectorAll("#per_game > thead > tr > th");
    const headers : string[] = [];
    await statHeaders.forEach(async (header) => {
      const headerText = await header.innerText;
      headers.push(headerText);
    });

    const careerStats = tab.querySelectorAll("#per_game > tbody > tr");
    const playerStats : IPlayerStats[] = [];
    await careerStats.forEach(async (stat, index) => {
      const yearlyStats : IPlayerStats = {};
      const text = await stat.innerText;
      const statValues = text.split("\t");
      for (let i = 0; i < headers.length; i++) {
        yearlyStats[headers[i]] = statValues[i];
      }

      playerStats.push(yearlyStats);
    });

    return playerStats;
  } catch (error) {
    console.error(error);
    throw new Error("Error extracting player career stats");
  }
}

(async () => {
  const hero = new Hero();

  const newTab = await hero.newTab();
  const teams = await extractAllTeamsUrl(newTab);

  for (const team of teams) {
    const seasonUrl = await extractLatestSeasonUrl(newTab, team.url);
    await newTab.waitForMillis(3000);
    const playerUrls = await extractPlayers(newTab, seasonUrl);
    await newTab.waitForMillis(3000);
    team.players = playerUrls;
    console.log(`Extracted players for ${team.teamName}`);

    for (const player of team.players) {
      const careerStats = await extractPlayerCareerStats(newTab, player.playerUrl);
      await newTab.waitForMillis(3000);
      player.annualStats = careerStats;
      console.log(`Extracted career stats for ${player.playerName}`);
    }
  }

  fs.writeFileSync("teams.json", JSON.stringify(teams, null, 2));
  await hero.close();
})();