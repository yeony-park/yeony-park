import { readFile, writeFile } from "node:fs/promises";

const apiKey = process.env.WAKATIME_API_KEY;

if (!apiKey) {
  throw new Error("WAKATIME_API_KEY is required");
}

const response = await fetch(
  "https://wakatime.com/api/v1/users/current/stats/last_7_days",
  {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    },
  },
);

if (!response.ok) {
  throw new Error(`WakaTime API request failed with status ${response.status}`);
}

const { data } = await response.json();
const readmePath = "README.md";
let readme = await readFile(readmePath, "utf8");
const projects = (data.projects ?? []).filter(
  ({ name }) => !String(name).startsWith("yeony-park-profile"),
);

const renderRows = (rows = []) => {
  if (rows.length === 0) {
    return "No activity tracked";
  }

  return rows
    .slice(0, 5)
    .map(({ name, percent, text }) => {
      const safeName = String(name).replaceAll("`", "'").slice(0, 24);
      const percentage = Number(percent) || 0;
      const filled = Math.round(percentage / 4);
      const bar = `${"█".repeat(filled)}${"░".repeat(25 - filled)}`;

      return `${safeName.padEnd(24)} ${String(text).padEnd(17)} ${bar} ${percentage
        .toFixed(2)
        .padStart(6)} %`;
    })
    .join("\n");
};

const replaceSection = (source, sectionName, content) => {
  const start = `<!--START_SECTION:${sectionName}-->`;
  const end = `<!--END_SECTION:${sectionName}-->`;
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`README section markers not found: ${sectionName}`);
  }

  return `${source.slice(0, startIndex)}${start}\n\n${content}\n\n${source.slice(
    endIndex,
  )}`;
};

readme = replaceSection(
  readme,
  "waka_languages",
  `\`\`\`txt\n${renderRows(data.languages)}\n\`\`\``,
);
readme = replaceSection(
  readme,
  "waka_projects",
  `\`\`\`txt\n${renderRows(projects)}\n\`\`\``,
);

await writeFile(readmePath, readme);
