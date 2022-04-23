import { createCanvas } from "canvas";
import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";
import fetch from "node-fetch";

interface UserStat {
  source: string;
  username: string;
  timestamp: string;
  totalCred: string;
  avgCred: string;
  team: string;
}

const urls = [
  "https://boinc.bakerlab.org/rosetta/userw.php?id=2375195",
  "https://einsteinathome.org/userw.php?id=1041241",
];

/**
 * Given a list of BOINC userw urls to pull from, fetch the user stats for each and return an UserStat
 * @param urls List of urls to fetch data from
 * @returns List of UserStat objects in descending order based on total credit per project
 */
async function fetchUserStats(urls: string[]): Promise<UserStat[]> {
  const xmlParser = new XMLParser({
    stopNodes: ["wml.card.p"],
  });
  const responses = await Promise.all(urls.map((url) => fetch(url))),
    xmlData = await Promise.all(responses.map((res) => res.text())),
    data = xmlData.map((xml) => xmlParser.parse(xml));

  const cleanedData: UserStat[] = [];

  data.map((item) => {
    const [source, _, username, timestamp, totalCred, avgCred, __, team] =
      item?.wml?.card?.p?.split("<br/>");
    cleanedData.push({
      source,
      username: username.replace("for ", "").trim(),
      timestamp: timestamp.replace("Time: ", "").trim(),
      totalCred: totalCred.replace("User TotCred: ", "").trim(),
      avgCred: avgCred.replace("User AvgCred: ", "").trim(),
      team: team.replace("Team: ", "").trim(),
    });
  });

  cleanedData.sort((a, b) => parseInt(b.totalCred) - parseInt(a.totalCred));

  return cleanedData;
}

/**
 * Given a list of user stats, render a png image of all the user's stats in descending order and save to fs.
 * @param stats
 */
async function generateUserImage(stats: UserStat[]): Promise<void> {
  const width = 300,
    height = 100,
    LEFT_MARGIN = 4,
    TITLE_PX = 10,
    TEXT_PX = 8,
    VERT_SPACE_BETWEEN = 4,
    SCALE_FACTOR = 1;

  const canvas = createCanvas(width, height),
    context = canvas.getContext("2d");

  canvas.width = width * SCALE_FACTOR;
  canvas.height = height * SCALE_FACTOR;
  context.scale(SCALE_FACTOR, SCALE_FACTOR);

  // Initialize context and fill background color
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.save();

  // Title
  context.fillStyle = "#fff";
  context.font = `bold ${TITLE_PX}pt Menlo`;
  const text = stats?.[0].username
    ? `${stats?.[0].username}'s Stats`
    : "Stats for user";
  context.fillText(text, LEFT_MARGIN, TITLE_PX + VERT_SPACE_BETWEEN);

  for (const [index, row] of stats.entries()) {
    const text = `${row.source} ${row.totalCred}`;
    context.fillStyle = "#fff";
    context.font = `bold ${TEXT_PX}pt Menlo`;
    context.fillText(
      text,
      LEFT_MARGIN,
      TITLE_PX +
        VERT_SPACE_BETWEEN +
        VERT_SPACE_BETWEEN +
        TEXT_PX +
        (TEXT_PX + VERT_SPACE_BETWEEN) * index
    );
  }

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("./stats.png", buffer);
}

// Run everything
(async () => {
  console.log("Fetching user data");
  const cleanedData: UserStat[] = await fetchUserStats(urls);
  console.log("Generating image");
  await generateUserImage(cleanedData);
  console.log("Done!");
})();
