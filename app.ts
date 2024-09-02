import Hero from "@ulixee/hero-playground";

(async () => {
  const hero = new Hero();
  await hero.goto("https://www.nba.com/game/atl-vs-chi-1522400055/game-charts");
  const title = await hero.document.title;
  console.log("Title:", title);

  const boxScore = hero.querySelector("#box-score");
  await hero.waitForElement(boxScore, {
    timeoutMs: 10000,
  });
  await boxScore.click();

  const sectionElement = hero.querySelector('section[class^="GameBoxscore_gbTableSection"]');
  await hero.waitForElement(sectionElement, {
    waitForVisible: true,
    timeoutMs: 10000,
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
  await hero.close();
})();