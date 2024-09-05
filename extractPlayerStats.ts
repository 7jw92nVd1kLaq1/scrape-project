import Hero, { ISuperNode, Tab } from "@ulixee/hero-playground";
import { Session } from '@ulixee/hero-core';
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

type IDeleteSession = {
  id: string;
  databasePath: string;
} | undefined;

const extractAllTeamsUrl = async () => {
  const hero = new Hero();

  try {
    await hero.goto("https://www.basketball-reference.com/teams/");
    console.log(await hero.document.title);

    const teamTables = hero.querySelectorAll("#teams_active > tbody > tr > th > a");
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
  } finally {
    await hero.waitForMillis(2000);
    await hero.close();
  }
};

const extractLatestSeasonUrl = async (url: string) => {
  const hero = new Hero();
  try {
    await hero.goto(url);

    const seasonRow = hero.querySelector("tbody > tr[data-row='0'] > th > a");
    await hero.waitForElement(seasonRow, {
      timeoutMs: 5000,
    });

    const seasonUrl = `https://www.basketball-reference.com${await seasonRow.getAttribute("href")}`;

    return seasonUrl;
  } catch (error) {
    console.error(error);
    throw new Error("Error extracting latest season");
  } finally {
    await hero.waitForMillis(2000);
    await hero.close();
  }
}

const extractPlayers = async (url: string) => {
  const hero = new Hero();
  try {
    await hero.goto(url);

    const playerTables = hero.querySelectorAll("#roster > tbody > tr > td[data-stat='player'] > a");
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
  } finally {
    await hero.waitForMillis(2000);
    await hero.close();
  }
};

const extractPlayerCareerStats = async (url: string) => {
  const hero = new Hero();
  try {
    await hero.goto(url);

    const statHeaders = hero.querySelectorAll("#per_game > thead > tr > th");
    const headers : string[] = [];
    await statHeaders.forEach(async (header) => {
      const headerText = await header.innerText;
      headers.push(headerText);
    });

    const careerStats = hero.querySelectorAll("#per_game > tbody > tr");
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
  } finally {
    await hero.waitForMillis(2000);
    await hero.close();
  }
}

function sessionCloseCallback(deleteSession: IDeleteSession) {
  if (!deleteSession) return;
  // NOTE: determine if database should be kept (track session ids vs errors on your own)
  fs.unlink(deleteSession.databasePath, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Deleted session ${deleteSession.id} database`);
  });
}

Session.events.on('closed', sessionCloseCallback);

(async () => {
  const teams = await extractAllTeamsUrl();

  while (teams.length > 0) {
    const team = teams[0];
    const seasonUrl = await extractLatestSeasonUrl(team.url);
    const playerUrls = await extractPlayers(seasonUrl);
    team.players = playerUrls;
    console.log(`Extracted players for ${team.teamName}`);

    for (const player of team.players) {
      const careerStats = await extractPlayerCareerStats(player.playerUrl);
      player.annualStats = careerStats;
      console.log(`Extracted career stats for ${player.playerName}`);
    }

    fs.writeFileSync(`${team.teamName}.json`, JSON.stringify(team, null, 2));

    // delete the first item in a list
    teams.shift();
  }
})();