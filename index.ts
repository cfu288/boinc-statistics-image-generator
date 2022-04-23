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

  return cleanedData;
}

async function generateUserImage(stats: UserStat[]): Promise<void> {
  const width = 300;
  const height = 100;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  canvas.width = width * 2;
  canvas.height = height * 2;
  context.scale(2, 2);

  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);

  for (const [index, row] of stats.entries()) {
    const text = `${row.source} ${row.totalCred}`;

    const textWidth = context.measureText(text).width;
    context.fillRect(600 - textWidth / 2 - 10, 170 - 5, textWidth + 20, 120);
    context.fillStyle = "#fff";
    context.font = "bold 10pt Menlo";

    context.fillText(text, 4, 12 + 14 * index);
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
