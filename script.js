/* WildQuest AI 2.0 — nature quest builder, saved quests and local Ollama integration. */
"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  minutes: 15,
  mood: "calm",
  saved: false,
  quest: null,
  ollamaAvailable: false,
  ollamaModel: "",
  // Embedding-only models cannot generate text. Pick a small generative model by default.
  preferredModel: "qwen3:4b"
};

const questLibrary = {
  calm: [
    { kicker: "A MOMENT OF CALM", title: "The Tiny Wonder Walk", description: "Step outside and let your attention wander. Your only goal is to notice one small thing that makes you pause.", steps: ["Leave your phone in your pocket and take three slow breaths.", "Find a leaf, a shadow, or a sound you would usually walk past.", "Stay with it for one full minute. What did you notice?"] },
    { kicker: "SLOW DOWN & BREATHE", title: "Five Senses Reset", description: "Give your senses a gentle reset. Let the outside world be the only thing asking for your attention.", steps: ["Find a safe, comfortable spot and feel your feet on the ground.", "Name one thing you can see, hear, smell, and feel.", "Take five unhurried breaths before heading back."] },
    { kicker: "A QUIET MOMENT", title: "Clouds Without a Clock", description: "Find a patch of sky and watch it without needing to get anywhere. You have permission to do nothing for a moment.", steps: ["Look up from a safe place away from traffic.", "Notice the shape, color, and movement of the clouds or tree canopy.", "Choose one detail to remember, then continue your day a little slower."] },
    { kicker: "A SOFTER PACE", title: "The Listening Bench", description: "Let the world come to you. Find a comfortable spot and notice the layers of sound around you.", steps: ["Sit or stand somewhere safe and comfortable.", "Identify one nearby sound and one distant sound.", "Take three slow breaths and leave the place as you found it."] }
  ],
  curious: [
    { kicker: "FOLLOW YOUR CURIOSITY", title: "The Micro-Safari", description: "A whole ecosystem might be hiding in a tiny patch of green. Explore it like a field researcher.", steps: ["Choose a small area you can observe without disturbing it.", "Look for three different leaf shapes, textures, or tiny signs of life.", "Pick your favorite discovery and wonder what role it plays in nature."] },
    { kicker: "NOTICE THE DETAILS", title: "Nature's Hidden Patterns", description: "Nature is full of repeated shapes and surprising patterns. Today, you're on a pattern-spotting mission.", steps: ["Look for spirals, symmetry, stripes, or branching shapes.", "Find two examples that are similar but not identical.", "Take a mental snapshot and notice where else that pattern appears."] },
    { kicker: "FIELD NOTES", title: "The Tiny Detective", description: "Turn an ordinary corner into a place worth investigating. Your mission is to notice details, not disturb them.", steps: ["Choose a plant, tree, cloud, or patch of ground from a respectful distance.", "Observe its colors, edges, patterns, and the light around it.", "Invent one question you would love to research later."] }
  ],
  move: [
    { kicker: "GENTLE EXPLORATION", title: "The Different Way Home", description: "Take a safe, familiar route and explore it as if you're seeing it for the first time. The point is noticing, not distance.", steps: ["Choose a safe path you know and keep an eye on your surroundings.", "Walk at a comfortable pace and notice one detail on each block or bend.", "Pause at a safe spot, stretch gently, and pick one thing you hadn't noticed before."] },
    { kicker: "GET YOUR STEPS IN", title: "The Green Detour", description: "Find a small green detour in your day. It doesn't need to be a forest; a tree-lined street counts.", steps: ["Choose a safe route with a tree, garden, or patch of sky.", "Walk comfortably and look for changing light, leaves, or birds.", "Finish with a slow breath before you return to your routine."] },
    { kicker: "MOVE WITH AWARENESS", title: "The Five-Minute Explorer", description: "A tiny change of pace can make a familiar place feel new. Explore only where it is safe and permitted.", steps: ["Pick a well-lit, familiar route or a safe outdoor space.", "Walk at a comfortable pace and spot three shades of green or blue.", "Stop somewhere safe, look around, and choose one detail to remember."] }
  ],
  creative: [
    { kicker: "MAKE SOMETHING WITH NATURE", title: "The Color Collector", description: "Use your eyes like a paint palette. Gather a collection of colors from the world around you without picking anything.", steps: ["Find five colors in plants, stones, sky, or light.", "Give each color an imaginative name, like 'rain-soaked fern'.", "If you like, sketch the palette later from memory—leave nature where it is."] },
    { kicker: "A CREATIVE RESET", title: "Tiny Nature Haiku", description: "Let one outdoor moment become three short lines. No perfect poetry required—just pay attention.", steps: ["Notice one small scene: a moving branch, bird call, or patch of light.", "Think of three short lines that capture what you see, hear, or feel.", "Keep the words in your memory or write them down after your walk."] },
    { kicker: "MAKE A MEMORY", title: "The Invisible Postcard", description: "Create a postcard in your mind using only what you can see and hear. Nothing needs to be collected or photographed.", steps: ["Notice the sky, a nearby plant, and one sound.", "Imagine a postcard title that captures this exact moment.", "Remember one detail to tell a friend later."] }
  ]
};

const moodLabels = {
  calm: "A MOMENT OF CALM",
  curious: "FOLLOW YOUR CURIOSITY",
  move: "GENTLE EXPLORATION",
  creative: "MAKE SOMETHING WITH NATURE"
};

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function selectRandom(items, avoidTitle = "") {
  const candidates = items.filter(item => item.title !== avoidTitle);
  const pool = candidates.length ? candidates : items;
  return pool[Math.floor(Math.random() * pool.length)];
}

function safeParseSaved() {
  try {
    const value = JSON.parse(localStorage.getItem("wildquest-saved") || "[]");
    return Array.isArray(value) ? value.filter(item => item && typeof item.title === "string") : [];
  } catch (_) {
    return [];
  }
}

function updateSavedCount() {
  const count = $("#savedCount");
  if (count) count.textContent = String(safeParseSaved().length);
}

const progressStorageKey = "wildquest-progress";
const questXP = 25;

const achievementMilestones = [
  { count: 1, title: "First Footsteps", description: "Complete your first nature quest.", icon: "🌱" },
  { count: 5, title: "Curious Explorer", description: "Complete 5 nature quests.", icon: "🧭" },
  { count: 10, title: "Nature Noticer", description: "Complete 10 nature quests.", icon: "🍃" },
  { count: 25, title: "WildQuest Champion", description: "Complete 25 nature quests.", icon: "🏆" }
];

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
    const completed = Array.isArray(value.completed) ? value.completed : [];
    return {
      completed: completed.filter(item =>
        item &&
        typeof item.key === "string" &&
        typeof item.title === "string"
      )
    };
  } catch (_) {
    return { completed: [] };
  }
}

function getQuestKey(quest) {
  return `${String(quest.title || "").trim().toLowerCase()}::${String(quest.description || "").trim().toLowerCase()}`;
}

function getNatureLevel(count) {
  if (count >= 25) return "WildQuest Champion";
  if (count >= 10) return "Nature Noticer";
  if (count >= 5) return "Curious Explorer";
  if (count >= 1) return "Trail Beginner";
  return "Nature Newcomer";
}

function renderProgressDashboard() {
  const progress = readProgress();
  const count = progress.completed.length;
  const xp = count * questXP;
  const unlocked = achievementMilestones.filter(item => count >= item.count);

  $("#progressXp").textContent = String(xp);
  $("#progressCompleted").textContent = String(count);
  $("#progressAchievements").textContent = String(unlocked.length);
  $("#progressLevel").textContent = getNatureLevel(count);

  const next = achievementMilestones.find(item => count < item.count);
  $("#achievementSummary").textContent = next
    ? `${next.count - count} more ${next.count - count === 1 ? "quest" : "quests"} to unlock ${next.title}.`
    : "You've reached every current milestone. Keep exploring at your own pace.";

  const list = $("#progressAchievementList");
  list.replaceChildren();

  achievementMilestones.forEach(item => {
    const isUnlocked = count >= item.count;
    const card = document.createElement("article");
    card.className = `achievement-card${isUnlocked ? " unlocked" : " locked"}`;

    const icon = document.createElement("span");
    icon.className = "achievement-icon";
    icon.textContent = isUnlocked ? item.icon : "🔒";
    icon.setAttribute("aria-hidden", "true");

    const copy = document.createElement("div");
    copy.className = "achievement-copy";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const description = document.createElement("p");
    description.textContent = item.description;

    const status = document.createElement("span");
    status.className = "achievement-status";
    status.textContent = isUnlocked ? "UNLOCKED" : `${item.count} QUESTS`;

    copy.append(title, description, status);
    card.append(icon, copy);
    list.append(card);
  });
}

function completeCurrentQuest() {
  if (!state.quest || !state.questStarted) {
    showToast("Start your quest first, then come back when you've finished.");
    return;
  }

  const progress = readProgress();
  const key = getQuestKey(state.quest);

  if (progress.completed.some(item => item.key === key)) {
    state.questStarted = false;
    $("#completeQuestButton").disabled = true;
    showToast("You've already earned XP for this quest. Try a new adventure!");
    return;
  }

  progress.completed.unshift({
    key,
    title: state.quest.title,
    completedAt: new Date().toISOString()
  });

  try {
    localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  } catch (_) {
    showToast("Browser storage is unavailable. Your progress couldn't be saved.");
    return;
  }

  const oldCount = progress.completed.length - 1;
  const newCount = progress.completed.length;
  const newlyUnlocked = achievementMilestones.filter(item =>
    oldCount < item.count && newCount >= item.count
  );

  state.questStarted = false;
  $("#completeQuestButton").disabled = true;
  $("#completeQuestButton").textContent = "Quest completed ✓";
  $("#questStatus").textContent = "You did it! Thanks for spending a little time with nature.";

  renderProgressDashboard();
  showToast(
    newlyUnlocked.length
      ? `Quest complete! +${questXP} XP · Achievement unlocked: ${newlyUnlocked[0].title}!`
      : `Quest complete! You earned ${questXP} XP. Lovely work.`
  );
}
function renderQuest(quest, source = "local") {
  state.quest = {
    kicker: String(quest.kicker || moodLabels[state.mood] || "YOUR NEXT QUEST").slice(0, 80),
    title: String(quest.title || "A Little Outdoor Adventure").slice(0, 100),
    description: String(quest.description || "Head outside and notice something wonderful.").slice(0, 500),
    steps: (Array.isArray(quest.steps) ? quest.steps : []).filter(step => typeof step === "string").slice(0, 3).map(step => step.slice(0, 220))
  };
  state.saved = false;
  // Every newly rendered quest must start in the not-yet-started state.
  state.questStarted = false;
  $("#completeQuestButton").disabled = true;
  $("#completeQuestButton").textContent = "Complete quest · +25 XP";
  $("#resultKicker").textContent = state.quest.kicker;
  $("#resultTitle").textContent = state.quest.title;
  $("#resultDescription").textContent = state.quest.description;
  $("#resultMinutes").textContent = `${state.minutes} MIN`;
  const steps = state.quest.steps.length ? state.quest.steps : [
    "Choose a safe place to explore and take a slow breath.",
    "Notice a detail you might usually walk past.",
    "Pause, enjoy the moment, and leave nature undisturbed."
  ];
  $("#questSteps").replaceChildren();
  steps.forEach((step, index) => {
    const row = document.createElement("div");
    row.className = "quest-step";
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("p");
    text.textContent = step;
    row.append(number, text);
    $("#questSteps").append(row);
  });
  $("#saveQuestButton").classList.remove("saved");
  $("#saveQuestButton").textContent = "♡";
  $("#resultFootnote").textContent = source === "ollama"
    ? `Generated by ${state.ollamaModel} running locally. Adapt the quest to your surroundings and stay safe.`
    : "Built-in quest library. Connect a generative Ollama model for AI-created quests. Adapt to your surroundings and stay safe.";
  $("#questStatus").textContent = source === "ollama"
    ? "Your local AI made this quest. Now go experience it."
    : "Your next chapter starts when you close this tab.";
  $("#resultCard").classList.remove("result-refresh");
  void $("#resultCard").offsetWidth;
  $("#resultCard").classList.add("result-refresh");
}

function getLocalQuest() {
  const items = questLibrary[state.mood] || questLibrary.calm;
  return selectRandom(items, state.quest?.title);
}

function extractJson(text) {
  const cleaned = String(text).replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model did not return JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function generateWithOllama() {
  const environment = $("#environment").value;
  const extra = $("#extra").value.trim();
  const prompt = `You are WildQuest, an encouraging nature companion that gets people off screens and outdoors. Create one safe, accessible nature quest.
Return ONLY valid JSON with keys: kicker (short uppercase phrase), title (short creative title), description (1-2 sentences), steps (array of exactly 3 short actionable steps).
Available time: ${state.minutes} minutes. Environment: ${environment}. Desired mood: ${state.mood}. Extra context: ${extra || "none"}.
Safety: never encourage trespassing, touching unknown plants/animals, disturbing wildlife, eating wild plants, walking while looking at a screen, or going somewhere isolated. Offer an indoor/window alternative if outdoor access is not possible. Keep the quest doable in the time available.`;
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: state.ollamaModel,
      prompt,
      stream: false,
      format: "json",
      options: { temperature: 0.8 }
    })
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
  const data = await response.json();
  return extractJson(data.response || "");
}

function isEmbeddingModel(name) {
  return /embed|embedding|rerank|whisper|clip|guard/i.test(name);
}

async function checkOllama() {
  const status = $("#modelStatus");
  try {
    const response = await fetch("http://localhost:11434/api/tags", { method: "GET" });
    if (!response.ok) throw new Error("Ollama unavailable");
    const data = await response.json();
    const models = (data.models || []).filter(model => model.name && !isEmbeddingModel(model.name));
    if (!models.length) {
      state.ollamaAvailable = false;
      state.ollamaModel = "";
      status.textContent = (data.models || []).length ? "Embedding model only" : "Ollama connected · no model";
      status.title = "Install a text-generating model, for example: ollama pull qwen3:4b";
      return;
    }
    const preferred = models.find(model => model.name === state.preferredModel)
      || models.find(model => model.name.startsWith(state.preferredModel.split(":")[0] + ":"))
      || models[0];
    state.ollamaModel = preferred.name;
    state.ollamaAvailable = true;
    status.textContent = `Local AI · ${state.ollamaModel}`;
    status.title = "Generative model running through your local Ollama service.";
  } catch (_) {
    state.ollamaAvailable = false;
    state.ollamaModel = "";
    status.textContent = "Local quest mode";
    status.title = "Install/start Ollama and allow this Live Server origin to connect.";
  }
}

async function handleGenerate(event) {
  event?.preventDefault();
  const button = $("#generateButton");
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span class="button-spark">✦</span> Finding a little wonder…';
  try {
    if (state.ollamaAvailable && state.ollamaModel) {
      try {
        const quest = await generateWithOllama();
        if (!quest.title || !quest.description || !Array.isArray(quest.steps)) throw new Error("Incomplete quest response");
        renderQuest(quest, "ollama");
        showToast("Your quest was created by local AI.");
      } catch (error) {
        console.warn("Local AI generation failed; using the built-in quest library.", error);
        renderQuest(getLocalQuest(), "local");
        showToast("Local AI couldn't respond. A quest from the built-in library is ready.");
      }
    } else {
      renderQuest(getLocalQuest(), "local");
      showToast("Quest ready! Install a generative Ollama model for AI quests.");
    }
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

function renderSavedQuests() {
  const list = $("#savedQuestList");
  const saved = safeParseSaved();
  list.replaceChildren();
  if (!saved.length) {
    const empty = document.createElement("div");
    empty.className = "saved-empty";
    empty.textContent = "No quests saved yet. Tap the heart on a quest to keep it here.";
    list.append(empty);
    $("#clearSavedButton").disabled = true;
    return;
  }
  $("#clearSavedButton").disabled = false;
  saved.forEach((quest, index) => {
    const item = document.createElement("article");
    item.className = "saved-quest-item";
    const emoji = document.createElement("div");
    emoji.className = "saved-quest-emoji";
    emoji.textContent = "🌿";
    const copy = document.createElement("div");
    copy.style.flex = "1";
    const title = document.createElement("h3");
    title.textContent = quest.title;
    const description = document.createElement("p");
    description.textContent = quest.description || "A small outdoor adventure.";
    const time = document.createElement("div");
    time.className = "saved-quest-time";
    time.textContent = `${quest.minutes || 15} MIN · ${(quest.mood || "calm").toUpperCase()}`;
    copy.append(title, description, time);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${quest.title} from saved quests`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      const latest = safeParseSaved();
      latest.splice(index, 1);
      localStorage.setItem("wildquest-saved", JSON.stringify(latest));
      renderSavedQuests();
      updateSavedCount();
      showToast("Saved quest removed.");
    });
    item.append(emoji, copy, remove);
    list.append(item);
  });
}

$$(".time-option").forEach(button => button.addEventListener("click", () => {
  $$(".time-option").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  state.minutes = Number(button.dataset.minutes);
  $("#time").value = String(state.minutes);
  $("#resultMinutes").textContent = `${state.minutes} MIN`;
}));

$$(".mood-option").forEach(button => button.addEventListener("click", () => {
  $$(".mood-option").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  state.mood = button.dataset.mood;
}));

$("#questForm").addEventListener("submit", handleGenerate);
$("#regenerateButton").addEventListener("click", () => handleGenerate());

$("#saveQuestButton").addEventListener("click", () => {
  if (!state.quest) return;
  const saved = safeParseSaved();
  const exists = saved.some(item => item.title === state.quest.title && item.description === state.quest.description);
  if (exists) {
    showToast("This quest is already in your saved list.");
    return;
  }
  saved.unshift({ ...state.quest, minutes: state.minutes, mood: state.mood, savedAt: new Date().toISOString() });
  try {
    localStorage.setItem("wildquest-saved", JSON.stringify(saved.slice(0, 20)));
    state.saved = true;
    $("#saveQuestButton").classList.add("saved");
    $("#saveQuestButton").textContent = "♥";
    updateSavedCount();
    showToast("Quest saved in this browser.");
  } catch (_) {
    showToast("Browser storage is unavailable, so this quest couldn't be saved.");
  }
});

const modal = $("#questModal");
$("#startQuestButton").addEventListener("click", () => {
  $("#modalTitle").textContent = state.quest?.title || "Go find your tiny wonder.";
  $("#modalMessage").textContent = `You have ${state.minutes} minutes for this quest. Pick a safe place, keep aware of your surroundings, and enjoy the moment without needing to document it.`;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
});
function closeModal() { modal.hidden = true; document.body.style.overflow = ""; }
$("#closeModal").addEventListener("click", closeModal);
$("#finishPrepButton").addEventListener("click", () => {
  state.questStarted = true;
  $("#completeQuestButton").disabled = false;
  $("#completeQuestButton").textContent = "Complete quest · +25 XP";
  $("#questStatus").textContent = "Quest in progress. When you're finished, return here to celebrate.";
  closeModal();
  showToast("Quest started. Come back when you've finished to earn XP.");
});

$("#completeQuestButton").addEventListener("click", completeCurrentQuest);
modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") { closeModal(); closeSavedModal(); } });

const savedModal = $("#savedModal");
function openSavedModal() {
  renderSavedQuests();
  savedModal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeSavedModal() { if (!savedModal) return; savedModal.hidden = true; document.body.style.overflow = ""; }
$("#savedQuestsButton").addEventListener("click", openSavedModal);
$("#closeSavedModal").addEventListener("click", closeSavedModal);
$("#clearSavedButton").addEventListener("click", () => {
  localStorage.removeItem("wildquest-saved");
  renderSavedQuests();
  updateSavedCount();
  showToast("Saved quests cleared.");
});
savedModal.addEventListener("click", event => { if (event.target === savedModal) closeSavedModal(); });

$("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("soft-light");
  showToast(document.body.classList.contains("soft-light") ? "Forest glow turned up." : "Back to deep forest mode.");
});
$("#menuButton").addEventListener("click", () => $(".nav-links").classList.toggle("open"));
$$(".nav-links a").forEach(link => link.addEventListener("click", () => $(".nav-links").classList.remove("open")));

updateSavedCount();
renderProgressDashboard();
renderQuest(questLibrary.calm[0], "local");
checkOllama();
window.setInterval(checkOllama, 30000);


// Photo-card reveals and subtle pointer tilt. All effects respect reduced-motion preferences.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = document.querySelectorAll(".photo-card, .section-heading, .manifesto-art, .manifesto-copy, .stats-strip > div, .closing-cta > *");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    revealItems.forEach((item, index) => {
      if (!item.classList.contains("photo-card")) item.classList.add("reveal-on-scroll");
      if (item.classList.contains("photo-card")) item.style.transitionDelay = `${(index % 4) * 75}ms`;
      observer.observe(item);
    });
  } else {
    revealItems.forEach(item => item.classList.add("is-visible"));
  }
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".photo-card").forEach(card => {
      card.addEventListener("pointermove", event => {
        if (!card.classList.contains("is-visible")) return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translateY(-3px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg) scale(1.005)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }
})();



/* Weather FX + Moss, the local-first AI nature buddy. These additions are isolated from quest/progress logic. */
(() => {
  const weatherButton = document.querySelector("#weatherButton");
  const stormLayer = document.querySelector("#stormLayer");
  const rainCanvas = document.querySelector("#rainCanvas");
  const windCanvas = document.querySelector("#windCanvas");
  const lightningSvg = document.querySelector("#lightningSvg");
  const lightningBolt = document.querySelector("#lightningBolt");
  const stormFlash = document.querySelector(".storm-flash");
  if (weatherButton && stormLayer && rainCanvas && windCanvas && lightningSvg && lightningBolt && stormFlash) {
    const modes = [
      { key: "sunny", label: "Sunny + Breeze", icon: "☀" },
      { key: "cloudy", label: "Cloudy", icon: "☁" },
      { key: "rainy", label: "Rainy + Lightning", icon: "🌧⚡" }
    ];
    let modeIndex = 0;
    let drops = [];
    let windStreaks = [];
    let rainRaf = 0;
    let windRaf = 0;
    let strikeTimer = 0;
    const ctx = rainCanvas.getContext("2d");
    const windCtx = windCanvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function sizeCanvases() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      [rainCanvas, windCanvas].forEach(canvas => {
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        const context = canvas === rainCanvas ? ctx : windCtx;
        if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      drops = Array.from({ length: Math.min(210, Math.floor(window.innerWidth / 5)) }, () => ({
        x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
        length: 8 + Math.random() * 17, speed: 7 + Math.random() * 10, drift: 1.5 + Math.random() * 3
      }));
      windStreaks = Array.from({ length: Math.min(28, Math.floor(window.innerWidth / 45)) }, () => ({
        x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
        length: 18 + Math.random() * 65, speed: 1.2 + Math.random() * 2.7,
        curve: (Math.random() - .5) * 14, alpha: .08 + Math.random() * .2
      }));
    }
    function drawRain() {
      if (!ctx || !document.body.classList.contains("weather-rainy")) { rainRaf = 0; return; }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.strokeStyle = "rgba(190,220,255,.48)"; ctx.lineWidth = 1.1; ctx.beginPath();
      for (const d of drops) {
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.drift, d.y + d.length);
        d.y += reducedMotion ? 0 : d.speed; d.x -= reducedMotion ? 0 : d.drift;
        if (d.y > window.innerHeight + d.length) { d.y = -d.length; d.x = Math.random() * window.innerWidth; }
        if (d.x < -10) d.x = window.innerWidth + 10;
      }
      ctx.stroke(); rainRaf = window.requestAnimationFrame(drawRain);
    }
    function drawWind() {
      if (!windCtx || !document.body.classList.contains("weather-sunny")) { windRaf = 0; return; }
      windCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const w of windStreaks) {
        windCtx.beginPath(); windCtx.moveTo(w.x, w.y);
        windCtx.quadraticCurveTo(w.x + w.length * .45, w.y + w.curve, w.x + w.length, w.y - w.curve * .3);
        windCtx.strokeStyle = `rgba(207,255,221,${w.alpha})`; windCtx.lineWidth = 1.2; windCtx.stroke();
        if (!reducedMotion) w.x += w.speed;
        if (w.x > window.innerWidth + w.length) { w.x = -w.length; w.y = Math.random() * window.innerHeight; }
      }
      windRaf = window.requestAnimationFrame(drawWind);
    }
    function makeLightning() {
      const startX = 120 + Math.random() * 760;
      let x = startX, y = 0;
      const points = [[x, y]];
      const segments = 7 + Math.floor(Math.random() * 5);
      for (let i = 1; i <= segments; i++) {
        y = i * (520 / segments); x += (Math.random() - .5) * 95;
        points.push([Math.max(20, Math.min(980, x)), y]);
      }
      let path = `M ${points[0][0]} ${points[0][1]}`;
      for (const pt of points.slice(1)) path += ` L ${pt[0]} ${pt[1]}`;
      const forkAt = points[Math.max(2, Math.floor(points.length * .55))];
      path += ` M ${forkAt[0]} ${forkAt[1]} l ${Math.random() > .5 ? 38 : -38} 38 l ${Math.random() > .5 ? 12 : -12} 42`;
      lightningBolt.setAttribute("d", path); lightningSvg.classList.add("lightning-active");
      stormFlash.classList.remove("flash-active"); void stormFlash.offsetWidth; stormFlash.classList.add("flash-active");
      window.setTimeout(() => lightningSvg.classList.remove("lightning-active"), 180 + Math.random() * 170);
    }
    function planStrike() {
      window.clearTimeout(strikeTimer);
      if (document.body.classList.contains("weather-rainy") && !reducedMotion) {
        strikeTimer = window.setTimeout(() => {
          if (document.body.classList.contains("weather-rainy")) makeLightning();
          if (Math.random() > .55) window.setTimeout(() => {
            if (document.body.classList.contains("weather-rainy")) makeLightning();
          }, 180 + Math.random() * 350);
          planStrike();
        }, 1800 + Math.random() * 4700);
      }
    }
    function setWeather(index, notify = true) {
      modeIndex = index;
      const mode = modes[modeIndex];
      document.body.classList.remove("weather-sunny", "weather-cloudy", "weather-rainy", "weather-storm");
      document.body.classList.add(`weather-${mode.key}`);
      weatherButton.dataset.weather = mode.key;
      weatherButton.innerHTML = `${mode.icon} <span>${mode.label}</span>`;
      weatherButton.setAttribute("aria-label", `Weather effects: ${mode.label}. Click to change.`);
      weatherButton.title = `Current visual weather: ${mode.label}. Click to change weather`;
      if (mode.key === "rainy") {
        sizeCanvases(); if (!rainRaf) rainRaf = window.requestAnimationFrame(drawRain);
      } else {
        if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (rainRaf) window.cancelAnimationFrame(rainRaf); rainRaf = 0;
      }
      if (mode.key === "sunny") {
        sizeCanvases(); if (!windRaf) windRaf = window.requestAnimationFrame(drawWind);
      } else {
        if (windCtx) windCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (windRaf) window.cancelAnimationFrame(windRaf); windRaf = 0;
      }
      if (mode.key === "rainy") planStrike();
      else {
        window.clearTimeout(strikeTimer); lightningSvg.classList.remove("lightning-active");
        stormFlash.classList.remove("flash-active");
      }
      try { localStorage.setItem("wildquest-weather-mode", mode.key); } catch (_) {}
      if (notify && typeof showToast === "function") showToast(`${mode.label} weather effects enabled.`);
    }
    weatherButton.addEventListener("click", () => setWeather((modeIndex + 1) % modes.length));
    window.addEventListener("resize", sizeCanvases, { passive: true });
    sizeCanvases();
    try {
      const savedMode = localStorage.getItem("wildquest-weather-mode");
      const savedIndex = modes.findIndex(mode => mode.key === savedMode);
      setWeather(savedIndex >= 0 ? savedIndex : 0, false);
    } catch (_) { setWeather(0, false); }
  }

  const launcher = document.querySelector("#wildbotLauncher");
  const panel = document.querySelector("#wildbotPanel");
  const close = document.querySelector("#wildbotClose");
  const form = document.querySelector("#wildbotForm");
  const input = document.querySelector("#wildbotInput");
  const messages = document.querySelector("#wildbotMessages");
  if (!launcher || !panel || !close || !form || !input || !messages) return;

  let busy = false;
  const addMessage = (text, role) => {
    const bubble = document.createElement("article");
    bubble.className = `wildbot-message ${role === "user" ? "user-message" : "bot-message"}`;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  };
  function setPanel(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
    else launcher.focus();
  }
  launcher.addEventListener("click", () => setPanel(panel.hidden));
  close.addEventListener("click", () => setPanel(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) setPanel(false);
  });
  document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => {
    input.value = button.getAttribute("data-prompt") || "";
    form.requestSubmit();
  }));

  function fallbackAnswer(question) {
    const q = question.toLowerCase();
    if (/storm|thunder|lightning|rain|weather/.test(q)) {
      return "Storm safety first: if you hear thunder or see lightning, head indoors or into a fully enclosed hard-topped vehicle. Avoid open fields, hilltops, isolated trees, water, and metal fences. Do not wait under a tree. If you cannot reach shelter, move away from tall isolated objects and crouch low as a last resort. The weather effect in this app is only a visual simulation, not a forecast.";
    }
    if (/quest|5.minute|five.minute|outside|bored/.test(q)) {
      return "Try a tiny 5-minute quest 🌿: (1) Choose a safe spot close to home. (2) Notice three different shades of green or three natural sounds. (3) Pick one detail you normally overlook. Leave plants and wildlife undisturbed, and stay aware of traffic and your surroundings.";
    }
    if (/wildquest|how.*work|ollama|model|ai/.test(q)) {
      return "WildQuest helps you turn a short break into a real-world nature quest. Choose your time, mood, and environment in the quest builder. If Ollama is running locally with a text-generating model, Moss can use it to answer questions; otherwise I use a small built-in help guide. Your quest progress is stored in this browser.";
    }
    if (/anxious|stress|overwhelm|tired/.test(q)) {
      return "Let's keep it gentle. If it feels safe, pause where you are, relax your shoulders, and take three comfortable slow breaths. You could try a two-minute listening break or simply rest indoors. You don't have to push yourself or go outside if conditions aren't right.";
    }
    return "I can help with nature quest ideas, outdoor safety, weather precautions, and how to use WildQuest AI. For a more specific answer, tell me a little more about the situation. If Ollama is running locally, I'll try asking your local model too.";
  }

  async function askLocalModel(question) {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3:4b",
        stream: false,
        messages: [
          { role: "system", content: "You are Moss, the friendly and practical nature companion inside WildQuest AI. Answer clearly and concisely. Help with app use, nature observations, gentle outdoor activities, and general questions. Prioritize safety. During lightning or thunder, advise moving into a substantial enclosed building or hard-topped vehicle; never recommend sheltering under an isolated tree. Do not claim to know live weather, local conditions, or current facts unless the user supplies them. Do not claim to perform actions you cannot perform. Keep most answers under 140 words." },
          { role: "user", content: question }
        ],
        options: { temperature: 0.65 }
      })
    });
    if (!response.ok) throw new Error(`Local model returned ${response.status}`);
    const data = await response.json();
    const answer = data?.message?.content?.trim();
    if (!answer) throw new Error("Local model returned an empty answer");
    return answer.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() || fallbackAnswer(question);
  }

  async function submitQuestion(question) {
    if (!question || busy) return;
    addMessage(question, "user");
    input.value = "";
    busy = true;
    const typing = document.createElement("article");
    typing.className = "wildbot-message bot-message wildbot-typing";
    typing.setAttribute("aria-label", "Moss is thinking");
    typing.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    let answer;
    try {
      answer = await askLocalModel(question);
    } catch (_) {
      answer = fallbackAnswer(question);
    } finally {
      typing.remove();
      busy = false;
    }
    addMessage(answer, "bot");
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    submitQuestion(input.value.trim());
  });
})();


// Lightweight reading progress indicator; does not touch quest state.
(() => {
  const bar = document.querySelector("#scrollProgressBar");
  if (!bar) return;
  let ticking = false;
  const update = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)) : 0;
    bar.style.width = `${progress}%`;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
})();
