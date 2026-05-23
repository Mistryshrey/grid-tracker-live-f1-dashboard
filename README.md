# 🏁 The Pit Wall · Live F1 2026 Dashboard

A premium, full-stack, auto-updating Formula 1 dashboard built with a cinematic magazine-style editorial layout. This project features a tailored onboarding experience designed specifically for **Princcyy🥰**, which transitions seamlessly into a live data hub tracking the entire 2026 F1 season.

The project has been optimized for serverless architecture and is fully deployed on **Vercel**.

---

## 🏎️ Key Features

* **Personalized Cinematic Welcome:** Replaces traditional forms with a customized, typographic word-reveal welcome sequence tracking identity profiles natively.
* **Interactive Driver Selection:** Allows locking in a favorite driver profile from the grid, instantly flooding the dashboard layout with matching team accent colors, telemetry rows, and reactive particle burst animations.
* **Fully Automated 2026 Season Tracking:** Connects directly to the automated Jolpica F1 API engine to fetch live-updating driver standings, constructor points, and official session calendars without manual intervention.
* **Paddock Intel & Race Recap:** Displays real-world podium classifications, qualifying gaps down to the millisecond, tire compound stint charts, and context-aware weather stats from the latest Grand Prix.
* **Virtual Live Circuit:** Features an animated SVG race track map tracking top field placement with responsive, team-colored car markers looping along stylized racing paths.

---

## 🛠️ Tech Stack

* **Frontend:** Semantic HTML5, Custom CSS3 Architecture (CSS variables, keyframe animations, responsive flex/grid viewports), Vanilla ES6 JavaScript.
* **Backend:** Node.js, Express framework, asynchronous multi-stream parallel fetch architectures.
* **Deployment:** Vercel Serverless Functions Architecture.

---

## 📁 Repository Directory Structure

```text
├── index.html        # Main dashboard frontend structure & typography engine
├── script.js         # Frontend interactive configuration module
├── vercel.json       # Cloud routing matrix proxying frontend fetches to the API
├── package.json      # Dependencies configuration tracking Express, Cors, and Node-Fetch
├── package-lock.json # Frozen package dependency tree
└── api/
    └── index.js      # Serverless Node.js backend handler executing parallel REST aggregations
