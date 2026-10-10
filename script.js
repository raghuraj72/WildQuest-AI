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

function renderQuest(quest, source = "local") {
  state.quest = {
    kicker: String(quest.kicker || moodLabels[state.mood] || "YOUR NEXT QUEST").slice(0, 80),
    title: String(quest.title || "A Little Outdoor Adventure").slice(0, 100),
    description: String(quest.description || "Head outside and notice something wonderful.").slice(0, 500),
    steps: (Array.isArray(quest.steps) ? quest.steps : []).filter(step => typeof step === "string").slice(0, 3).map(step => step.slice(0, 220))
  };
  state.saved = false;
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
  closeModal();
  showToast("Quest started. Have a lovely time outside!");
});
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
