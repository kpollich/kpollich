require("dotenv").config();

const axios = require("axios");
const qs = require("query-string");
const fs = require("fs");
const path = require("path");
const { html } = require("common-tags");

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

  console.log("Generating HTML...");
  const html = generateArtistHtml(topArtists.items);

  const readme = await (
    await fs.promises.readFile(path.join(__dirname, "../README.md"))
  ).toString();

  const newReadme = readme.replace(
    /\<\!\-\- begin artists \-\-\>(.|\s)*\<\!\-\- end artists \-\-\>/gi,
    html
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

function generateArtistHtml(artists) {
  let artistsHtml = "";

  for (const artist of artists.slice(0, 5)) {
    const name = artist.name;
    const url = artist.external_urls.spotify;
    const image = artist.images[artist.images.length - 1].url;

    artistsHtml += html`
      <div
        style="display:flex;flex-direction:column;align-items:center;justify-content:space-between;"
      >
        <img src="${image}" alt="${name}" style="height:160px;width:160px" />
        <a href="${url}">${name}</a>
      </div>
    `;
  }

  return html`
    <!-- begin artists -->

    <div
      id="artists"
      style="display:grid;grid-template-columns:repeat(auto-fill, 160px);grid-gap:15px;justify-items:start;"
    >
      ${artistsHtml}
    </div>
    <!-- end artists -->
  `;
}
