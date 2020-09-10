require("dotenv").config();

const axios = require("axios");
const qs = require("query-string");
const fs = require("fs");
const path = require("path");
const { stripIndent } = require("common-tags");

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
} = process.env;

main()
  .then(() => console.log("Done"))
  .catch((error) => console.error(error));

async function main() {
  const token = await getAccessToken();
  console.log(`Got access token: ${token}`);

  const topArtists = await getTopArtists(token);
  console.log("Got artists data");

  console.log("Generating Artists Markdown...");
  const artistsMarkdown = generateArtistMarkdown(topArtists.items);

  const readme = (
    await fs.promises.readFile(path.join(__dirname, "../README.md"))
  ).toString();

  const newReadme = readme.replace(
    /\<\!\-\- begin artists \-\-\>(.|\s)*\<\!\-\- end artists \-\-\>/gi,
    artistsMarkdown
  );

  await fs.promises.writeFile(path.join(__dirname, "../README.md"), newReadme);
}

async function getAccessToken() {
  const url = "https://accounts.spotify.com/api/token";
  const body = qs.stringify({
    grant_type: "refresh_token",
    refresh_token: SPOTIFY_REFRESH_TOKEN,
  });

  const authHeader = getAuthHeader();

  const response = await axios.post(url, body, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const { access_token: token } = response.data;

  return token;
}

function getAuthHeader() {
  const token = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");
  const authHeader = `Basic ${token}`;

  return authHeader;
}

async function getTopArtists(token) {
  const url = "https://api.spotify.com/v1/me/top/artists?time_range=short_term";

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

function generateArtistMarkdown(artists) {
  let images = [];
  let links = [];

  for (const artist of artists.slice(0, 5)) {
    const name = artist.name;
    const url = artist.external_urls.spotify;
    const image = artist.images[artist.images.length - 1].url;

    images.push({ url: image, alt: name });
    links.push({ name, url });
  }

  const imageRow = `|${images
    .map(({ url, alt }) => `![${alt}](${url})`)
    .join("|")}|`;

  const linksRow = `|${links
    .map(({ name, url }) => `[${name}](${url})`)
    .join("|")}|`;

  return stripIndent`
    <!-- begin artists -->
      ${imageRow}
      |:---:|:---:|:---:|:---:|:---:|
      ${linksRow}
    <!-- end artists -->
  `;
}
