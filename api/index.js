import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ─── HELPER UTILITIES ────────────────────────────────────────────────────────
function normaliseTeamId(constructorId = "") {
  const map = {
    "red_bull":      "red_bull", "mercedes": "mercedes", "ferrari": "ferrari",
    "mclaren":       "mclaren", "alpine": "alpine", "williams": "williams",
    "haas":          "haas", "alphatauri": "racing_bulls", "rb": "racing_bulls",
    "racing_bulls":  "racing_bulls", "aston_martin": "aston_martin",
    "kick_sauber":   "sauber", "sauber": "sauber", "audi": "audi", "cadillac": "cadillac",
  };
  const key = constructorId.toLowerCase().replace(/\s+/g, "_");
  return map[key] || key;
}

function shortName(given, family) {
  return `${(given || "").charAt(0)}. ${family || ""}`;
}

function raceStatus(raceDateUtc) {
  const now = Date.now();
  const start = Date.parse(raceDateUtc);
  if (isNaN(start)) return "upcoming";
  if (now > start + 3 * 60 * 60 * 1000) return "done";
  if (now >= start) return "live";
  return "upcoming";
}

async function jolpiFetch(path) {
  const url = `https://api.jolpi.ca/ergast/f1${path}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`jolpi ${path} → HTTP ${r.status}`);
  return r.json();
}

// ─── MAIN STANDINGS AGGREGATOR ───────────────────────────────────────────────
async function buildStandings() {
  const [drvRaw, ctorRaw, schedRaw, lastRaw, qualiRaw] = await Promise.allSettled([
    jolpiFetch("/current/driverStandings.json"),
    jolpiFetch("/current/constructorStandings.json"),
    jolpiFetch("/current.json"),
    jolpiFetch("/current/last/results.json"),
    jolpiFetch("/current/last/qualifying.json"),
  ]);

  const ok = (r) => r.status === "fulfilled" ? r.value : null;
  const drvList = ok(drvRaw)?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  const leaderPts = drvList.length ? Number(drvList[0].points) : 0;

  const drivers = drvList.map((d, i) => ({
    pos:              Number(d.position),
    code:             d.Driver.code || d.Driver.familyName.slice(0, 3).toUpperCase(),
    given_name:       d.Driver.givenName,
    family_name:      d.Driver.familyName,
    short_name:       shortName(d.Driver.givenName, d.Driver.familyName),
    permanent_number: d.Driver.permanentNumber || "",
    team_name:        d.Constructors[0]?.name ?? "",
    team_id:          normaliseTeamId(d.Constructors[0]?.constructorId ?? ""),
    nationality:      d.Driver.nationality,
    pts:              Number(d.points),
    wins:             Number(d.wins),
    gap:              i === 0 ? null : Number(d.points) - leaderPts,
  }));

  const ctorList = ok(ctorRaw)?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
  const constructors = ctorList.map((c) => ({
    pos:      Number(c.position),
    name:     c.Constructor.name,
    team_id:  normaliseTeamId(c.Constructor.constructorId),
    pts:      Number(c.points),
    wins:     Number(c.wins),
  }));

  const jolpiRaces = ok(schedRaw)?.MRData?.RaceTable?.Races ?? [];
  const schedule = jolpiRaces.map((r) => {
    const dateStr = r.date && r.time ? `${r.date}T${r.time}` : r.date ? `${r.date}T13:00:00Z` : null;
    return {
      round:       Number(r.round),
      name:        r.raceName,
      short_name:  r.raceName.replace(" Grand Prix", " GP"),
      country:     r.Circuit.Location.country,
      locality:    r.Circuit.Location.locality,
      circuit:     r.Circuit.circuitName,
      circuit_id:  r.Circuit.circuitId,
      date:        r.date,
      start_utc:   dateStr,
      status:      dateStr ? raceStatus(dateStr) : "upcoming",
    };
  });

  const next_race = schedule.find((r) => r.status !== "done") || schedule[schedule.length - 1] || null;
  const lastResults = ok(lastRaw)?.MRData?.RaceTable?.Races?.[0] ?? null;
  const qualiResults = ok(qualiRaw)?.MRData?.RaceTable?.Races?.[0] ?? null;
  let last_race = null;

  if (lastResults) {
    const results = lastResults.Results ?? [];
    const podium = results.slice(0, 3).map((r) => ({
      pos:          Number(r.position),
      driver:       `${r.Driver.givenName} ${r.Driver.familyName}`,
      driver_short: shortName(r.Driver.givenName, r.Driver.familyName),
      code:         r.Driver.code || r.Driver.familyName.slice(0, 3).toUpperCase(),
      team:         r.Constructor.name,
      team_id:      normaliseTeamId(r.Constructor.constructorId),
      points:       Number(r.points),
      time:         r.Time?.time || r.status || "",
      fastest_lap:  r.FastestLap?.Time?.time || null,
    }));

    const race_results = results.map((r) => ({
      pos:          Number(r.position),
      driver_short: shortName(r.Driver.givenName, r.Driver.familyName),
      code:         r.Driver.code || r.Driver.familyName.slice(0, 3).toUpperCase(),
      team_id:      normaliseTeamId(r.Constructor.constructorId),
      points:       Number(r.points),
    }));

    let qualifying = null;
    if (qualiResults) {
      const qResults = (qualiResults.QualifyingResults ?? []).map((q) => ({
        pos:          Number(q.position),
        driver_short: shortName(q.Driver.givenName, q.Driver.familyName),
        code:         q.Driver.code || q.Driver.familyName.slice(0, 3).toUpperCase(),
        team:         q.Constructor.name,
        team_id:      normaliseTeamId(q.Constructor.constructorId),
        q1:           q.Q1 || null, q2: q.Q2 || null, q3: q.Q3 || null,
        best:         q.Q3 || q.Q2 || q.Q1 || null,
      }));
      qualifying = {
        results: qResults,
        pole:    qResults[0] ? { driver_short: qResults[0].driver_short, time: qResults[0].q3 || qResults[0].q2 || qResults[0].q1 } : null,
      };
    }

    const dateStr = lastResults.date && lastResults.time ? `${lastResults.date}T${lastResults.time}` : lastResults.date ? `${lastResults.date}T13:00:00Z` : null;
    last_race = {
      round: Number(lastResults.round), name: lastResults.raceName, short_name: lastResults.raceName.replace(" Grand Prix", " GP"),
      country: lastResults.Circuit.Location.country, circuit: lastResults.Circuit.circuitName, circuit_id: lastResults.Circuit.circuitId,
      start_utc: dateStr, podium, race_results, qualifying, weather: null, stints: null,
    };
  }

  return { _fetched_at_utc: new Date().toISOString(), next_race, schedule, drivers, constructors, last_race };
}

// ─── ENDPOINTS ───────────────────────────────────────────────────────────────
app.get("/api/standings", async (req, res) => {
  try {
    const data = await buildStandings();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch F1 standings", detail: err.message });
  }
});

app.get("/api/driver/:code", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const codeToId = {
      VER: "verstappen", HAM: "hamilton", LEC: "leclerc", NOR: "norris", PIA: "piastri", 
      RUS: "russell", SAI: "sainz", ALB: "albon", ALO: "alonso", STR: "stroll", 
      GAS: "gasly", OCO: "ocon", HUL: "hulkenberg", TSU: "tsunoda", MAG: "magnussen", 
      BOT: "bottas", ZHO: "zhou", SAR: "sargeant", LAW: "lawson", BEA: "bearman", ANT: "antonelli"
    };
    const driverId = codeToId[code];
    if (!driverId) return res.status(404).json({ error: "Driver code unmapped" });

    const [winsRaw, polesRaw, seasonRaw] = await Promise.allSettled([
      jolpiFetch(`/drivers/${driverId}/results/1.json?limit=1`),
      jolpiFetch(`/drivers/${driverId}/qualifying/1.json?limit=1`),
      jolpiFetch(`/current/drivers/${driverId}/results.json`)
    ]);

    const totalWins = winsRaw.status === "fulfilled" ? Number(winsRaw.value?.MRData?.total ?? 0) : 0;
    const totalPoles = polesRaw.status === "fulfilled" ? Number(polesRaw.value?.MRData?.total ?? 0) : 0;
    const seasonRaces = seasonRaw.status === "fulfilled" ? (seasonRaw.value?.MRData?.RaceTable?.Races ?? []) : [];
    
    const season_results = seasonRaces.map(r => ({
      pos: r.Results?.[0]?.position ?? "—",
      short_name: r.raceName.replace(" Grand Prix", "").replace(" GP", ""),
      points: Number(r.Results?.[0]?.points ?? 0)
    }));

    res.json({ career: { wins: totalWins, poles: totalPoles }, season_results });
  } catch (err) {
    res.status(500).json({ error: "Failed to track driver details" });
  }
});

app.get("/api/live", (req, res) => res.json({ live: false }));
app.post("/api/thanks", (req, res) => res.json({ status: "success" }));

// EXPORT FOR VERCEL SERVERLESS ENVIRONMENT
export default app;