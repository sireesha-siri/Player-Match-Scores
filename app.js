const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDbServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running At http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Db Error ${e.message}`);
    process.exit(1);
  }
};

initializeDbServer();

//Convert player table from snake to camel case
const playerDetailsCamelCase = (player) => {
  return {
    playerId: player.player_id,
    playerName: player.player_name,
  };
};

//Get all players
app.get("/players/", async (request, response) => {
  const getPlayersQuery = `select * from player_details;`;
  const playersArray = await db.all(getPlayersQuery);
  response.send(playersArray.map((player) => playerDetailsCamelCase(player)));
});

//Get a player
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `select * from player_details where player_id = ${playerId};`;
  const player = await db.get(getPlayerQuery);
  response.send(playerDetailsCamelCase(player));
});

//Update player
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `update player_details set player_name = '${playerName}' 
  where player_id = ${playerId};`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

const matchDetailsCamelCase = (match) => {
  return {
    matchId: match.match_id,
    match: match.match,
    year: match.year,
  };
};

//Get details of a match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `select * from match_details where match_id = ${matchId};`;
  const matchDetails = await db.get(getMatchQuery);
  response.send(matchDetailsCamelCase(matchDetails));
});

//Get all matches of a player
app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const matchesByPlayerQuery = `select match_details.match_id, match_details.match, match_details.year
    from match_details natural join player_match_score 
    where player_match_score.player_id = ${playerId};`;
  const matchesByPlayerArray = await db.all(matchesByPlayerQuery);
  response.send(
    matchesByPlayerArray.map((matchByPlayer) =>
      matchDetailsCamelCase(matchByPlayer)
    )
  );
});

//Get players of match
app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const playersInMatchQuery = `select player_details.player_id, player_details.player_name
    from player_details natural join player_match_score 
    where player_match_score.match_id = ${matchId};`;
  const playersMatchQuery = await db.all(playersInMatchQuery);
  response.send(
    playersMatchQuery.map((playerInMatch) =>
      playerDetailsCamelCase(playerInMatch)
    )
  );
});

//Get statistics
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const playersStatisticsQuery = `select player_details.player_id as playerId, player_details.player_name as playerName,
    sum(player_match_score.score) as totalScore, sum(player_match_score.fours) as totalFours,
    sum(player_match_score.sixes) as totalSixes from player_details inner join player_match_score 
    on player_details.player_id = player_match_score.player_id
    where player_match_score.player_id = ${playerId};`;
  const playersStatistics = await db.get(playersStatisticsQuery);
  response.send(playersStatistics);
});

module.exports = app;
