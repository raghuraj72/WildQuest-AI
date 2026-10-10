# WildQuest AI 🌿 — 3D Edition

**A little less scrolling. A lot more living.**

WildQuest AI turns a spare 5, 15, or 30 minutes into a small, real-world nature adventure. Choose an environment, available time, and mood; get a safe, doable quest; then head outside.

This edition adds an actual real-time **Three.js/WebGL 3D forest** with low-poly terrain, layered hills, trees, a radiant 3D sun, fireflies, flying 3D birds, and pointer-driven camera parallax. A separate lightweight pseudo-3D flock glides across the full dashboard, creating depth with perspective scaling and animated wings. It also adds a saved-quest library and fixes model selection so embedding-only models are not incorrectly used for text generation.

> Hacktoberfest Open-Source AI Challenge — Week 1 theme: **Touch Grass**

## Features

- **Interactive 3D forest:** Three.js scene, moving trees, animated 3D birds, radiant sun with rotating rays and a soft corona, fireflies, depth, pointer parallax, responsive resizing, and reduced-motion support.
- **Birds across the dashboard:** A lightweight full-screen canvas flock with wing flaps, depth scaling, and gentle flight paths. It does not block buttons or links and respects reduced-motion settings.
- **Real nature photography gallery:** Four responsive photographic cards from Unsplash with hover zoom, image shimmer, scroll reveals, and subtle pointer tilt.
- **Graceful fallback:** If WebGL or the Three.js CDN is unavailable, the rest of the app and its CSS nature artwork remain usable.
- **Personalized quests:** Pick environment, 5/15/30/60 minutes, and a mood: calm, curious, movement, or creative.
- **Local AI through Ollama:** Uses a locally installed text-generating model. No hosted model API key is required.
- **Correct model filtering:** Embedding-only models such as `qwen3-embedding:0.6b` are excluded from generation.
- **Saved quests:** Save up to 20 quests, view them from the heart icon, remove individual quests, or clear the list.
- **Works without AI:** A built-in quest library is available if Ollama is not installed or running.
- **Responsive design:** Desktop and mobile layouts, keyboard-accessible controls, reduced-motion support.

## Project structure

```text
WildQuest-AI/
├── index.html
├── styles.css
├── script.js
├── scene3d.js
├── bird-flight.js
└── README.md
```

## Run it in VS Code

1. Extract the project ZIP.
2. In VS Code, choose **File → Open Folder** and select the extracted `WildQuest-AI` folder.
3. Install the **Live Server** extension by Ritwick Dey if you have not already.
4. Right-click `index.html` → **Open with Live Server**.
5. The page should open at a local address such as `http://127.0.0.1:5500/index.html`.

The 3D scene imports Three.js from jsDelivr and the photo gallery loads images from Unsplash, so an internet connection is needed for those visuals. The quest builder and saved quests work locally without a model.

## Connect generative AI with Ollama

**Important:** `qwen3-embedding:0.6b` is an embedding model. It is not a chat/text-generation model, so it cannot create quests. Install a generative model instead.

For your laptop, start with a small model:

```powershell
ollama pull qwen3:4b
```

If that model is too slow or your available memory is limited, try:

```powershell
ollama pull gemma3:1b
```

Then confirm it is installed:

```powershell
ollama list
```

Ollama normally listens on `http://localhost:11434`. Browsers may block requests from Live Server because of CORS. To allow only the usual local development origins:

1. Quit Ollama from the system tray if it is already running as a background app.
2. Open a new PowerShell terminal.
3. Run:

```powershell
$env:OLLAMA_ORIGINS="http://localhost:5500,http://127.0.0.1:5500"
ollama serve
```

4. Keep that terminal open, refresh WildQuest, and look for `Local AI · qwen3:4b` (or the model you installed) in the status pill.
5. Generate a quest. If local AI is not available, the app still returns a built-in quest.

If port 11434 is already in use, Ollama may already be running. Close the existing Ollama process/app before running `ollama serve` with the environment variable. Do not expose Ollama to public networks or allow arbitrary browser origins on shared machines.

## Interactive sky effects

- A colorful flock of larger, feather-detailed birds flies across the viewport in loose groups.
- Soft volumetric-style clouds drift overhead.
- Use the floating weather control to switch between sunny, cloudy, and rainy skies. Rain adds animated droplets and a subtle cool haze.
- The effects are drawn on a transparent canvas and do not intercept clicks on the page. They respect the operating system reduced-motion preference.

## Controls

- **Find my next quest:** jumps to the quest builder.
- **Generate my nature quest:** creates a local-AI quest when Ollama is available, otherwise uses the built-in library.
- **↻:** generate a different quest.
- **♡:** save the current quest.
- **Heart/count in the header:** view or remove saved quests.
- **I'm heading out:** opens a short safety/preparation dialog.
- **Sun icon:** toggles the ambience theme.
- **Pointer movement over the 3D landscape:** shifts the camera for a subtle depth effect.

## Privacy and safety

When using local AI, prompts are sent to your local Ollama service on your own computer. The 3D scene downloads Three.js from a CDN. Google Fonts are also loaded externally by default. To make the visuals fully offline, vendor those dependencies locally and remove external font imports.

Treat AI suggestions as inspiration, not expert outdoor guidance. Stay in public/permitted areas, watch traffic, weather, terrain, and daylight, do not touch/eat unknown plants or fungi, and do not disturb wildlife. Keep your phone accessible for navigation and emergencies. If outdoor access is not safe, choose the balcony/windowsill option or observe nature from a window.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- Three.js / WebGL
- Ollama (optional local open-weight generative model)
- Browser `localStorage`

## Before submitting to DEV

- [ ] Test the UI on desktop and mobile.
- [ ] Verify the 3D scene in a WebGL-capable browser.
- [ ] Verify actual local-model generation before claiming the model was tested.
- [ ] Capture your own screenshot or demo.
- [ ] Push this folder to a public GitHub repository.
- [ ] Publish the DEV post using the challenge's required template and tags `#devchallenge` and `#hf26challenge`.
- [ ] Check the official challenge rules and deadline.

## License

This project can be distributed under the MIT License. Add a `LICENSE` file containing the standard MIT text before publishing if you want to formally include the license. Check the selected AI model's own license separately.
