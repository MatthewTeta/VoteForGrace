require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs");

const { POLL_ID, SEARCH_STRING, BATCH_SIZE, FILENAME } = process.env;
console.log(`POLL_ID:\t${POLL_ID}`);
console.log(`SEARCH_STRING:\t${SEARCH_STRING}`);
console.log(`BATCH_SIZE:\t${BATCH_SIZE}`);
console.log(`FILENAME:\t${FILENAME}`);

const vote = async (browser) => {
  const page = await browser.newPage();
  await page.goto(`https://poll.fm/${POLL_ID}/`);
  await page.evaluate((SEARCH_STRING) => {
    console.log(SEARCH_STRING);
    let labels = document.querySelectorAll(".pds-answer-span");
    labels.forEach((elem) => {
      if (elem.innerHTML.indexOf(SEARCH_STRING) !== -1) {
        elem.click();
      }
    });
  }, SEARCH_STRING);
  // await page.screenshot({ path: `a${i}.png` });
  await page.evaluate(() => {
    let voteButton = document.querySelector(".vote-button");
    voteButton.click();
  });
  try {
    await page.waitForNavigation({ waitUntil: "networkidle2" });
  } catch (e) {
    return 0;
  }
  await page.evaluate((SEARCH_STRING) => {
    let labels = document.querySelectorAll(".pds-answer-text");
    labels.forEach((elem) => {
      if (elem.innerHTML.indexOf(SEARCH_STRING) !== -1) {
        console.log(elem);
      }
    });
  });
  // await page.screenshot({ path: `p${i}.png` });
  const percent = await page.evaluate(
    async (SEARCH_STRING) =>
      new Promise((resolve) => {
        let labels = document.querySelectorAll(".pds-answer-text");
        labels.forEach((elem) => {
          if (elem.innerHTML.indexOf(SEARCH_STRING) !== -1) {
            elem.parentElement.childNodes.forEach((elem) => {
              if (
                elem.className !== undefined &&
                elem.className === "pds-feedback-result"
              ) {
                const pc = elem.childNodes[1].innerHTML.split("&nbsp;")[1];
                console.log(pc);
                resolve(pc);
              }
            });
          }
        });
      }),
    SEARCH_STRING
  );
  return percent;
};

const run = async (browser, j) => {
  let i = 0;
  let promises = [];
  while (i < BATCH_SIZE) {
    promises.push(vote(browser));
    // await vote(i);
    // console.log(i);
    i++;
  }
  percentages = await Promise.all(promises);
  // console.log(percentages);
  // const new_percent = percentages.reduce((best, current) => {
  //   const curr = parseInt(current.split("%")[0], 10);
  //   if (curr > best) return curr;
  //   return best;
  // }, 0);
  const str = `${(j + 1) * BATCH_SIZE}: ${percentages.join(", ")}\n`;
  fs.writeFile(FILENAME, str, (err) => {
    if (err) console.error(err);
  });
  return await run(browser, j + 1);
};

const start = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const context = await browser.createIncognitoBrowserContext();
  await run(context, 0, 0);
  await browser.close();
};
start();
// console.log("Hello");
