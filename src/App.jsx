import React, { useState, useEffect, useCallback } from "react";

/* ----------------------------------------------------------------
   Design tokens (shares the warm, minimalist language of TalkSpark)
   Background:  #FFF7ED   Card: #FFFFFF   Ink: #2B2621
   Question:    #FF6B57 (coral) + wash #FFE7E1
   Activity:    #2BB3A3 (teal)  + wash #DFF6F2
   Sand accent: #E8A94E (used in the logo + Random Select tool)
   Fonts: 'Baloo 2' (display) / 'Nunito' (body)
------------------------------------------------------------------- */

const LANGS = {
  en: { flag: "🇳🇿", label: "English (NZ)" },
  hi: { flag: "🇮🇳", label: "Hindi" },
  es: { flag: "🇪🇸", label: "Español" },
  fr: { flag: "🇫🇷", label: "Français" },
  mi: { flag: "🇳🇿", label: "Te Reo Māori" },
  zh: { flag: "🇨🇳", label: "中文 (Mandarin)" },
  sm: { flag: "🇼🇸", label: "Gagana Sāmoa" },
};

const RANDOM_CRITERIA = [
  "The student with the longest hair",
  "The oldest student in the room",
  "Whoever has exactly 3 letters in their first name",
  "Whoever's last name starts with the letter T",
  "The student wearing the most blue",
  "Whoever sits closest to the window",
  "The student with the birthday closest to today",
  "Whoever has the shortest hair",
  "The student wearing socks with a pattern",
  "Whoever's first name has the most letters",
  "The student sitting closest to the door",
  "Whoever has a pet at home",
  "The youngest student in the room",
  "Whoever is wearing something green",
  "The student sitting at the back of the room",
  "The student sitting in the front row",
  "Whoever has the newest shoes",
  "The student whose birthday is closest to the teacher's",
  "Whoever's surname comes first alphabetically",
  "The student wearing the most stripes",
  "Whoever was the last to put their hand up today",
  "The student whose surname has the most letters",
  "Whoever sits closest to the teacher's desk",
  "The student whose shoes are the same colour as their bag",
  "Whoever was the last to sit down this lesson",
];

/* ----------------------------------------------------------------
   Sound effects — generated with the Web Audio API so no external
   audio files are needed. A single shared AudioContext is created
   lazily on first use (must follow a user gesture, e.g. Start button).
------------------------------------------------------------------- */

let sharedAudioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new AC();
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  return sharedAudioCtx;
}

function playTone(freq, startDelay, duration, volume, type) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.value = freq;
  const now = ctx.currentTime + startDelay;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume || 0.18, now + 0.02);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

// Short rising arpeggio — plays when a new random criterion is chosen
function playChooseSound() {
  playTone(523.25, 0, 0.22, 0.2, "sine");
  playTone(659.25, 0.2, 0.22, 0.2, "sine");
  playTone(783.99, 0.4, 0.32, 0.22, "sine");
}

// Double beep — plays when the main discussion timer runs out
function playTimerEndSound() {
  playTone(880, 0, 0.3, 0.24, "square");
  playTone(880, 0.4, 0.3, 0.24, "square");
}

// Soft single chime — signals "quiet please, sharing time starting" (also used as the mid-share reminder)
function playQuietChime() {
  playTone(660, 0, 0.9, 0.16, "sine");
}

// Bright ding — plays when the 30s sharing timer ends
function playShareEndDing() {
  playTone(1046.5, 0, 0.5, 0.24, "sine");
}

/* ----------------------------------------------------------------
   REO PRACTICE — Te Reo Māori practice module across four topics
   (Locations, Colours, Numbers, Greetings), each spanning Starter to
   Fluent. Sentence patterns follow the locative/classifying structures
   and classroom phrases documented in the Te Reo Māori curriculum
   reference (Tau 4–6 locatives; Section 13 classroom quick-reference
   phrases, used verbatim, unmodified). Every task has a picture
   prompt, a keyboard-only control path, an optional hint, and a
   "listen" pronunciation button.
------------------------------------------------------------------- */

const REO_NOUNS = [
  { id: "pukapuka", mi: "pukapuka", en: "book", emoji: "📚" },
  { id: "pouaka", mi: "pouaka", en: "box", emoji: "📦" },
  { id: "rakau", mi: "rākau", en: "tree", emoji: "🌳" },
  { id: "kuaha", mi: "kūaha", en: "door", emoji: "🚪" },
  { id: "peke", mi: "pēke", en: "bag", emoji: "🎒" },
  { id: "whare", mi: "whare", en: "house", emoji: "🏠" },
  { id: "turu", mi: "tūru", en: "chair", emoji: "🪑" },
  { id: "motoka", mi: "motokā", en: "car", emoji: "🚗" },
];

const REO_PREPOSITIONS = [
  { id: "roto", mi: "roto", en: "in" },
  { id: "runga", mi: "runga", en: "on / above" },
  { id: "raro", mi: "raro", en: "under" },
  { id: "mua", mi: "mua", en: "in front of" },
  { id: "muri", mi: "muri", en: "behind" },
];

const REO_PREP_MARKER_STYLE = {
  roto: { transform: "scale(0.55)", opacity: 0.9, zIndex: 2 },
  runga: { transform: "translateY(-62%) scale(0.7)", zIndex: 2 },
  raro: { transform: "translateY(62%) scale(0.7)", zIndex: 2 },
  mua: { transform: "translateX(-58%) scale(0.7)", zIndex: 2 },
  muri: { transform: "translateX(28%) scale(0.7)", zIndex: 0 },
};

const REO_COLOURS = [
  { id: "whero", mi: "whero", en: "red", hex: "#E15B4F" },
  { id: "kikorangi", mi: "kikorangi", en: "blue", hex: "#4A90D9" },
  { id: "kowhai", mi: "kōwhai", en: "yellow", hex: "#F0C24B" },
  { id: "kakariki", mi: "kākāriki", en: "green", hex: "#4CAF7D" },
  { id: "ma", mi: "mā", en: "white", hex: "#F5F3EF" },
  { id: "pango", mi: "pango", en: "black", hex: "#2B2621" },
  { id: "parauri", mi: "parauri", en: "brown", hex: "#8B5E3C" },
  { id: "karaka", mi: "karaka", en: "orange", hex: "#E68A3C" },
];

const REO_NUMBERS = [
  { id: "tahi", mi: "tahi", en: "one", value: 1 },
  { id: "rua", mi: "rua", en: "two", value: 2 },
  { id: "toru", mi: "toru", en: "three", value: 3 },
  { id: "wha", mi: "whā", en: "four", value: 4 },
  { id: "rima", mi: "rima", en: "five", value: 5 },
  { id: "ono", mi: "ono", en: "six", value: 6 },
  { id: "whitu", mi: "whitu", en: "seven", value: 7 },
  { id: "waru", mi: "waru", en: "eight", value: 8 },
  { id: "iwa", mi: "iwa", en: "nine", value: 9 },
  { id: "tekau", mi: "tekau", en: "ten", value: 10 },
];

// Sourced verbatim from the classroom quick-reference table — never altered.
const REO_GREETINGS = [
  { id: "g1", mi: "Tēnā koutou, e te akomanga!", en: "Greeting the class", emoji: "👋" },
  { id: "g2", mi: "Whakarongo mai!", en: "Attention signal — listen!", emoji: "👂" },
  { id: "g3", mi: "E noho.", en: "Sit down", emoji: "🪑" },
  { id: "g4", mi: "E tū.", en: "Stand up", emoji: "🧍" },
  { id: "g5", mi: "Whakarārangi mai.", en: "Line up", emoji: "🚶" },
  { id: "g6", mi: "Ka rawe! Tino pai!", en: "Praise — excellent!", emoji: "🌟" },
  { id: "g7", mi: "Kia kaha!", en: "Encouragement — be strong!", emoji: "💪" },
  { id: "g8", mi: "E mārama ana?", en: "Check understanding — does that make sense?", emoji: "🤔" },
  { id: "g9", mi: "Whakahokia ngā taputapu.", en: "Pack up the equipment", emoji: "🧹" },
  { id: "g10", mi: "Ka kite anō, e te whānau.", en: "Dismissal — see you again", emoji: "👋" },
  { id: "g11", mi: "Kia ora.", en: "Hello (informal greeting)", emoji: "😊" },
  { id: "g12", mi: "Tēnā koe.", en: "Hello (formal, to one person)", emoji: "🙏" },
  { id: "g13", mi: "Nau mai.", en: "Welcome", emoji: "🤗" },
  { id: "g14", mi: "Haere rā.", en: "Goodbye (said to the person leaving)", emoji: "👋" },
  { id: "g15", mi: "E noho rā.", en: "Goodbye (said to the person staying)", emoji: "👋" },
  { id: "g16", mi: "Mō tōku hē.", en: "My apologies", emoji: "🙏" },
  { id: "g17", mi: "Tēnā koa.", en: "Please (polite request)", emoji: "🙏" },
];

// Sourced directly from the Master Knowledge Base (Tau 1 target example, and the
// O-category possessive examples). No invented vocabulary.
const REO_WHANAU_TERMS = [
  { id: "mama", mi: "māmā", en: "mum" },
  { id: "teina", mi: "teina", en: "younger sibling" },
  { id: "hoa", mi: "hoa", en: "friend" },
];
const REO_WHANAU_TALK = [
  { id: "wt1", mi: "Ko wai tō kaiako?", en: "Who is your teacher?", emoji: "🧑‍🏫", hint: "Try starting with: Ko..." },
  { id: "wt2", mi: "Kōrerohia: ko wai ō hoa pai?", en: "Talk about: who are your good friends?", emoji: "🧑‍🤝‍🧑", hint: "Try starting with: Ko..." },
];

// Sourced sentence pattern "He pai ki ahau te kai." (I like food.) plus the
// present-continuous example "Kei te kai te tamaiti i te āporo." — both given
// directly in the Master Knowledge Base.
const REO_FOOD_NOUN = { id: "aporo", mi: "āporo", en: "apple", emoji: "🍎" };
const REO_FOOD_TALK = [
  { id: "ft1", mi: "Kei te kai te tamaiti i te āporo.", en: "The child is eating the apple.", emoji: "🍎", hint: "This uses 'Kei te' for something happening right now." },
  { id: "ft2", mi: "Kōrerohia: he pai ki a koe te kai?", en: "Talk about: what food do you like?", emoji: "🍽️", hint: "Try starting with: He pai ki ahau te..." },
];

const REO_LOCATION_TALK = [
  { id: "lt1", mi: "Kōrerohia: kei hea tō pukapuka pai rawa atu i tō rūma?", en: "Talk about: where is your favourite book in your room?", emoji: "📚", hint: "Try starting with: Kei roto i te..." },
  { id: "lt2", mi: "Kōrerohia: kei hea te motokā i waho o tō kāinga?", en: "Talk about: where is the car outside your house?", emoji: "🚗", hint: "Try starting with: Kei mua i te..." },
  { id: "lt3", mi: "Whakaahuatia te rūma ako — kei hea ngā mea katoa?", en: "Describe the classroom — where is everything?", emoji: "🏫", hint: "Try starting with: Kei runga i te..." },
  { id: "lt4", mi: "Kōrerohia: he aha kei raro i tō tūru ināianei?", en: "Talk about: what's under your chair right now?", emoji: "🪑", hint: "Try starting with: Kei raro i..." },
  { id: "lt5", mi: "Whakaahuatia tō pēke kura — he aha kei roto?", en: "Describe your school bag — what's inside?", emoji: "🎒", hint: "Try starting with: Kei roto i taku pēke..." },
  { id: "lt6", mi: "Kōrerohia: kei hea te rākau tino teitei i tō rohe?", en: "Talk about: where's the tallest tree near you?", emoji: "🌳", hint: "Try starting with: Kei..." },
];

const REO_COLOUR_TALK = [
  { id: "ct1", mi: "Kōrerohia: he aha te tae o tō pōtae?", en: "Talk about: what colour is your hat?", emoji: "🧢", hint: "Try starting with: He..." },
  { id: "ct2", mi: "Kōrerohia: he aha ngā tae o te rāinamu?", en: "Talk about: what colours are in a rainbow?", emoji: "🌈", hint: "Try starting with: He whero, he..." },
  { id: "ct3", mi: "Whakaahuatia tō rūma — he aha ngā tae kei roto?", en: "Describe your room — what colours are inside?", emoji: "🖼️", hint: "Try starting with: He..." },
  { id: "ct4", mi: "Kōrerohia: he aha te tae pai rawa atu ki a koe?", en: "Talk about: what's your favourite colour?", emoji: "🎨", hint: "Try starting with: Ko taku tae pai..." },
];

const REO_NUMBER_TALK = [
  { id: "nt1", mi: "Kōrerohia: e hia ō tuakana, ō taina rānei?", en: "Talk about: how many older/younger siblings do you have?", emoji: "👨‍👩‍👧‍👦", hint: "Try starting with: E..." },
  { id: "nt2", mi: "Tatauria ngā tūru kei tō akomanga.", en: "Count the chairs in your classroom.", emoji: "🪑", hint: "Try starting with: E... ngā tūru." },
  { id: "nt3", mi: "Kōrerohia: e hia ō tau?", en: "Talk about: how old are you?", emoji: "🎂", hint: "Try starting with: E... aku tau." },
  { id: "nt4", mi: "Tatauria ngā pukapuka kei runga i tō tēpu.", en: "Count the books on your table.", emoji: "📚", hint: "Try starting with: E... ngā pukapuka." },
];

function buildLocationSentence(prep, noun) {
  return { mi: `Kei ${prep.mi} i te ${noun.mi}.`, en: `It's ${prep.en} the ${noun.en}.` };
}

// --- Task generators -------------------------------------------------

function generateLocationTasks(level) {
  if (level === "fluent") return shuffle(REO_LOCATION_TALK.map((p) => ({ id: p.id, kind: "talk", prompt: p })));
  if (level === "confident") {
    return shuffle(
      REO_NOUNS.map((noun, i) => {
        const prep = REO_PREPOSITIONS[(i + 1) % REO_PREPOSITIONS.length];
        return {
          id: `loc-build-${noun.id}`, kind: "builder",
          visual: { type: "location", noun, prep },
          promptEn: buildLocationSentence(prep, noun).en,
          words: ["Kei", prep.mi, "i", "te", `${noun.mi}.`],
          hint: `The word after "Kei" is the location word.`,
        };
      })
    );
  }
  const optionCount = level === "starter" ? 3 : 5;
  return shuffle(
    REO_NOUNS.map((noun, i) => {
      const correct = REO_PREPOSITIONS[i % REO_PREPOSITIONS.length];
      const distractors = shuffle(REO_PREPOSITIONS.filter((p) => p.id !== correct.id)).slice(0, optionCount - 1);
      const options = shuffle([correct, ...distractors]).map((p) => ({ id: p.id, label: p.mi }));
      return {
        id: `loc-${level}-${noun.id}`, kind: "finisher", direction: "mi-to-en",
        visual: { type: "location", noun, prep: correct },
        promptMi: `Kei ___ i te ${noun.mi}.`, promptEn: buildLocationSentence(correct, noun).en,
        options, correctId: correct.id, hint: `It starts with "${correct.mi[0]}".`,
        pronounce: buildLocationSentence(correct, noun).mi,
      };
    })
  );
}

function generateColourTasks(level) {
  if (level === "fluent") return shuffle(REO_COLOUR_TALK.map((p) => ({ id: p.id, kind: "talk", prompt: p })));
  if (level === "confident") {
    return shuffle(
      REO_NOUNS.map((noun, i) => {
        const colour = REO_COLOURS[i % REO_COLOURS.length];
        return {
          id: `col-build-${noun.id}`, kind: "builder",
          visual: { type: "colour", noun, colour },
          promptEn: `The ${noun.en} is ${colour.en}.`,
          words: ["He", colour.mi, "te", `${noun.mi}.`],
          hint: `The colour word comes right after "He".`,
        };
      })
    );
  }
  const optionCount = level === "starter" ? 3 : 5;
  return shuffle(
    REO_NOUNS.map((noun, i) => {
      const correct = REO_COLOURS[i % REO_COLOURS.length];
      const distractors = shuffle(REO_COLOURS.filter((c) => c.id !== correct.id)).slice(0, optionCount - 1);
      const options = shuffle([correct, ...distractors]).map((c) => ({ id: c.id, label: c.mi }));
      return {
        id: `col-${level}-${noun.id}`, kind: "finisher", direction: "mi-to-en",
        visual: { type: "colour", noun, colour: correct },
        promptMi: `He ___ te ${noun.mi}.`, promptEn: `The ${noun.en} is ${correct.en}.`,
        options, correctId: correct.id, hint: `It starts with "${correct.mi[0]}".`,
        pronounce: `He ${correct.mi} te ${noun.mi}.`,
      };
    })
  );
}

function generateNumberTasks(level) {
  if (level === "fluent") return shuffle(REO_NUMBER_TALK.map((p) => ({ id: p.id, kind: "talk", prompt: p })));
  if (level === "confident") {
    return shuffle(
      REO_NOUNS.map((noun, i) => {
        const number = REO_NUMBERS[(i * 2) % REO_NUMBERS.length];
        return {
          id: `num-build-${noun.id}`, kind: "builder",
          visual: { type: "count", noun, number },
          promptEn: `There are ${number.value} ${noun.en}${number.value > 1 ? "s" : ""}.`,
          words: ["E", number.mi, "ngā", `${noun.mi}.`],
          hint: `The number word comes right after "E".`,
        };
      })
    );
  }
  const pool = level === "starter" ? REO_NUMBERS.slice(0, 5) : REO_NUMBERS;
  const optionCount = level === "starter" ? 3 : 5;
  return shuffle(
    REO_NOUNS.map((noun, i) => {
      const correct = pool[i % pool.length];
      const distractors = shuffle(pool.filter((n) => n.id !== correct.id)).slice(0, optionCount - 1);
      const options = shuffle([correct, ...distractors]).map((n) => ({ id: n.id, label: n.mi }));
      return {
        id: `num-${level}-${noun.id}`, kind: "finisher", direction: "mi-to-en",
        visual: { type: "count", noun, number: correct },
        promptMi: `E ___ ngā ${noun.mi}.`, promptEn: `There are ${correct.value} ${noun.en}${correct.value > 1 ? "s" : ""}.`,
        options, correctId: correct.id, hint: `It starts with "${correct.mi[0]}".`,
        pronounce: `E ${correct.mi} ngā ${noun.mi}.`,
      };
    })
  );
}

function generateWhanauTasks(level) {
  if (level === "fluent") return shuffle(REO_WHANAU_TALK.map((p) => ({ id: p.id, kind: "talk", prompt: p })));
  if (level === "confident") {
    return [{
      id: "wh-build-1", kind: "builder",
      visual: { type: "icon", emoji: "🧑‍🏫" },
      promptEn: "My teacher is Pare.",
      words: ["Ko", "Pare", "taku", "kaiako."],
      hint: `"Ko" introduces who someone is.`,
    }];
  }
  const optionCount = level === "starter" ? 3 : 5;
  return shuffle(
    REO_WHANAU_TERMS.map((term) => {
      const distractors = shuffle(REO_WHANAU_TERMS.filter((t) => t.id !== term.id)).slice(0, Math.min(optionCount - 1, REO_WHANAU_TERMS.length - 1));
      const options = shuffle([term, ...distractors]).map((t) => ({ id: t.id, label: t.en }));
      return {
        id: `wh-${level}-${term.id}`, kind: "finisher", direction: "mi-to-en",
        visual: { type: "icon", emoji: "👨‍👩‍👧" },
        promptMi: term.mi, promptEn: `What does "${term.mi}" mean?`,
        options, correctId: term.id, hint: `Starts with "${term.en[0]}".`,
        pronounce: term.mi,
      };
    })
  );
}

function generateFoodTasks(level) {
  if (level === "fluent") return shuffle(REO_FOOD_TALK.map((p) => ({ id: p.id, kind: "talk", prompt: p })));
  const foodNouns = [...REO_NOUNS, REO_FOOD_NOUN];
  if (level === "confident") {
    return shuffle(
      foodNouns.map((noun) => ({
        id: `fd-build-${noun.id}`, kind: "builder",
        visual: { type: "icon", emoji: noun.emoji },
        promptEn: `I like the ${noun.en}.`,
        words: ["He", "pai", "ki", "ahau", "te", `${noun.mi}.`],
        hint: `"He pai ki ahau te..." means "I like the..."`,
      }))
    );
  }
  const optionCount = level === "starter" ? 3 : 5;
  return shuffle(
    foodNouns.map((noun) => {
      const distractors = shuffle(foodNouns.filter((n) => n.id !== noun.id)).slice(0, optionCount - 1);
      const options = shuffle([noun, ...distractors]).map((n) => ({ id: n.id, label: n.mi }));
      return {
        id: `fd-${level}-${noun.id}`, kind: "finisher", direction: "mi-to-en",
        visual: { type: "icon", emoji: noun.emoji },
        promptMi: `He pai ki ahau te ___.`, promptEn: `I like the ${noun.en}.`,
        options, correctId: noun.id, hint: `It starts with "${noun.mi[0]}".`,
        pronounce: `He pai ki ahau te ${noun.mi}.`,
      };
    })
  );
}
function generateGreetingTasks(level) {
  if (level === "fluent") {
    return shuffle(REO_GREETINGS.map((g) => ({
      id: `gr-talk-${g.id}`, kind: "talk",
      prompt: { mi: g.mi, en: `Practise saying this to your class: ${g.en}.`, emoji: g.emoji, hint: "Say it out loud, then use it for real today!" },
    })));
  }
  const optionCount = level === "starter" ? 3 : 5;
  const direction = level === "confident" ? "en-to-mi" : "mi-to-en";
  return shuffle(
    REO_GREETINGS.map((g) => {
      const distractors = shuffle(REO_GREETINGS.filter((o) => o.id !== g.id)).slice(0, optionCount - 1);
      const pool = shuffle([g, ...distractors]);
      const options = pool.map((o) => ({ id: o.id, label: direction === "en-to-mi" ? o.mi : o.en }));
      return {
        id: `gr-${level}-${g.id}`, kind: "finisher", direction,
        visual: { type: "icon", emoji: g.emoji },
        promptMi: direction === "en-to-mi" ? g.en : g.mi,
        promptEn: direction === "en-to-mi" ? g.mi : g.en,
        options, correctId: g.id,
        hint: direction === "en-to-mi" ? `It starts with "${g.mi[0]}".` : `Think about when you'd hear this.`,
        pronounce: g.mi,
      };
    })
  );
}

const REO_LEVEL_META = {
  starter: { label: "🌱 Starter" },
  developing: { label: "🌿 Developing" },
  confident: { label: "🌳 Confident" },
  fluent: { label: "🌟 Fluent" },
};

const REO_TOPICS = {
  locations: { label: "📍 Locations", generate: generateLocationTasks },
  colours: { label: "🎨 Colours", generate: generateColourTasks },
  numbers: { label: "🔢 Numbers", generate: generateNumberTasks },
  greetings: { label: "🙋 Greetings", generate: generateGreetingTasks },
  whanau: { label: "👨‍👩‍👧 Whānau", generate: generateWhanauTasks },
  food: { label: "🍎 Food", generate: generateFoodTasks },
};

// Real-life categories a teacher can combine — each maps to one or more
// underlying topics. Selecting several categories draws a combined pool.
const REO_CATEGORIES = {
  everyday: { label: "👋 Everyday", topics: ["greetings", "colours"] },
  school: { label: "🏫 School", topics: ["locations", "greetings"] },
  home: { label: "🏠 Home", topics: ["locations"] },
  whanau: { label: "👨‍👩‍👧 Whānau", topics: ["whanau", "greetings"] },
  food: { label: "🍎 Food", topics: ["food"] },
  travel: { label: "🚌 Travel & Places", topics: ["locations"] },
  conversation: { label: "💬 Conversation", topics: ["greetings", "whanau"] },
  numbers: { label: "🔢 Numbers", topics: ["numbers"] },
};

// --- Pronunciation (best-effort Web Speech API, no external audio files) --

function speakMaori(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const maoriVoice = voices.find((v) => /mi[-_]?nz/i.test(v.lang));
  const nzVoice = voices.find((v) => /en[-_]?nz/i.test(v.lang));
  utter.voice = maoriVoice || nzVoice || null;
  utter.lang = maoriVoice ? "mi-NZ" : "en-NZ";
  utter.rate = 0.82;
  window.speechSynthesis.speak(utter);
}

function PronounceButton({ text, keyLabel }) {
  return (
    <button className="reo-pronounce-btn" onClick={() => speakMaori(text)} title="Listen (or press P)">
      🔊 {keyLabel ? <span className="reo-key-badge">P</span> : "Whakarongo"}
    </button>
  );
}

// --- Visual prompt -----------------------------------------------------

function ReoVisual({ visual }) {
  if (!visual) return null;
  if (visual.type === "location") {
    const markerStyle = REO_PREP_MARKER_STYLE[visual.prep.id] || {};
    return (
      <div className="location-scene">
        <span className="location-scene-noun">{visual.noun.emoji}</span>
        <span className="location-scene-marker" style={markerStyle}>⭐</span>
      </div>
    );
  }
  if (visual.type === "colour") {
    return (
      <div className="colour-scene" style={{ background: visual.colour.hex }}>
        <span className="colour-scene-noun">{visual.noun.emoji}</span>
      </div>
    );
  }
  if (visual.type === "count") {
    return (
      <div className="count-scene">
        {Array.from({ length: visual.number.value }).map((_, i) => (
          <span key={i} className="count-scene-item">{visual.noun.emoji}</span>
        ))}
      </div>
    );
  }
  if (visual.type === "icon") {
    return (
      <div className="blob" style={{ background: "linear-gradient(135deg, #DFF6F2 0%, #C9F0E9 100%)" }}>
        <span className="blob-emoji">{visual.emoji}</span>
      </div>
    );
  }
  return null;
}

// --- Task components -----------------------------------------------------

const OPTION_KEYS = ["a", "b", "c", "d", "e"];

function ReoFinisherTask({ task, registerKeyHandler, onAnswered, showEnglish }) {
  const [selected, setSelected] = useState(null);
  const [showHint, setShowHint] = useState(false);

  function choose(opt) {
    if (selected) return;
    setSelected(opt);
    if (onAnswered) onAnswered(opt.id === task.correctId);
  }

  useEffect(() => {
    setSelected(null);
    setShowHint(false);
  }, [task.id]);

  useEffect(() => {
    return registerKeyHandler((e) => {
      const key = e.key.toLowerCase();
      if (key === "h") { setShowHint((s) => !s); return; }
      if (key === "p") { speakMaori(task.pronounce || task.promptMi); return; }
      const idx = OPTION_KEYS.indexOf(key);
      if (idx !== -1 && task.options[idx]) choose(task.options[idx]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, selected]);

  const answered = !!selected;
  const isCorrect = answered && selected.id === task.correctId;
  const hasBlank = task.promptMi.includes("___");
  const [before, after] = hasBlank ? task.promptMi.split("___") : [task.promptMi, ""];

  return (
    <div className="reo-task">
      <span className="reo-task-kind">💬 {hasBlank ? "Finish the sentence" : "Match it"}</span>
      <ReoVisual visual={task.visual} />
      {showEnglish && <p className="reo-english-hint">{task.promptEn}</p>}

      {hasBlank ? (
        <h1 className="reo-sentence">
          {before}<span className="reo-blank">{answered ? selected.label : "___"}</span>{after}
        </h1>
      ) : (
        <h1 className="reo-sentence">{task.promptMi}</h1>
      )}

      <div className="reo-options">
        {task.options.map((opt, i) => (
          <button
            key={opt.id}
            className={`reo-option ${answered && opt.id === selected.id ? (isCorrect ? "correct" : "incorrect") : ""} ${answered && opt.id === task.correctId && !isCorrect ? "reveal-correct" : ""}`}
            onClick={() => choose(opt)}
            disabled={answered}
          >
            <span className="reo-key-badge">{OPTION_KEYS[i].toUpperCase()}</span> {opt.label}
          </button>
        ))}
      </div>

      <div className="reo-task-footer">
        {task.pronounce && <PronounceButton text={task.pronounce} keyLabel />}
        <button className="reo-hint-btn" onClick={() => setShowHint((s) => !s)}>
          💡 Hint <span className="reo-key-badge">H</span>
        </button>
      </div>

      {showHint && !answered && <p className="reo-hint-text">💡 {task.hint}</p>}
      {answered && (
        <p className={`reo-feedback ${isCorrect ? "good" : "oops"}`}>
          {isCorrect ? "✅ Tika! That's right." : `❌ Not quite — it's "${task.options.find((o) => o.id === task.correctId)?.label}".`}
        </p>
      )}
    </div>
  );
}

function ReoBuilderTask({ task, registerKeyHandler, onAnswered, showEnglish }) {
  const [bank, setBank] = useState(() => shuffle(task.words.map((w, i) => ({ word: w, key: i }))));
  const [answer, setAnswer] = useState([]);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setBank(shuffle(task.words.map((w, i) => ({ word: w, key: i }))));
    setAnswer([]);
    setChecked(false);
    setShowHint(false);
  }, [task.id]);

  function addToAnswer(tile) {
    if (checked || !tile) return;
    setAnswer((a) => [...a, tile]);
    setBank((b) => b.filter((t) => t.key !== tile.key));
  }
  function removeLast() {
    if (checked || answer.length === 0) return;
    const tile = answer[answer.length - 1];
    setAnswer((a) => a.slice(0, -1));
    setBank((b) => [...b, tile]);
  }
  function removeFromAnswer(tile) {
    if (checked) return;
    setAnswer((a) => a.filter((t) => t.key !== tile.key));
    setBank((b) => [...b, tile]);
  }
  function handleDrop(e) {
    e.preventDefault();
    if (checked) return;
    const key = Number(e.dataTransfer.getData("text/plain"));
    addToAnswer(bank.find((t) => t.key === key));
  }
  function check() {
    const isCorrect = answer.map((t) => t.word).join(" ") === task.words.join(" ");
    setCorrect(isCorrect);
    setChecked(true);
    if (onAnswered) onAnswered(isCorrect);
  }
  function reset() {
    setBank(shuffle(task.words.map((w, i) => ({ word: w, key: i }))));
    setAnswer([]);
    setChecked(false);
  }

  useEffect(() => {
    return registerKeyHandler((e) => {
      const key = e.key.toLowerCase();
      if (key === "h") { setShowHint((s) => !s); return; }
      if (key === "p") { speakMaori(task.words.join(" ")); return; }
      if (key === "r") { reset(); return; }
      if (key === "backspace") { removeLast(); return; }
      if (key === "enter") { if (bank.length === 0) check(); return; }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= bank.length) addToAnswer(bank[num - 1]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, bank, answer, checked]);

  return (
    <div className="reo-task">
      <span className="reo-task-kind">🧩 Build the sentence</span>
      <ReoVisual visual={task.visual} />
      {showEnglish && <p className="reo-english-hint">{task.promptEn}</p>}

      <div className="reo-answer-row" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        {answer.length === 0 && <span className="reo-answer-placeholder">Tap, drag, or press number keys to add words in order</span>}
        {answer.map((tile) => (
          <button key={tile.key} className="reo-tile answer" onClick={() => removeFromAnswer(tile)}>{tile.word}</button>
        ))}
      </div>

      <div className="reo-word-bank">
        {bank.map((tile, i) => (
          <button
            key={tile.key}
            className="reo-tile"
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(tile.key))}
            onClick={() => addToAnswer(tile)}
          >
            <span className="reo-key-badge small">{i + 1}</span> {tile.word}
          </button>
        ))}
      </div>

      <div className="reo-builder-buttons">
        <button className="btn btn-secondary" onClick={reset} disabled={answer.length === 0}>↺ Reset <span className="reo-key-badge">R</span></button>
        <button className="btn btn-primary" onClick={check} disabled={checked || bank.length > 0}>✓ Check <span className="reo-key-badge">⏎</span></button>
      </div>
      <div className="reo-task-footer">
        <PronounceButton text={task.words.join(" ")} keyLabel />
        <button className="reo-hint-btn" onClick={() => setShowHint((s) => !s)}>💡 Hint <span className="reo-key-badge">H</span></button>
      </div>

      {showHint && <p className="reo-hint-text">💡 {task.hint} Full sentence: "{task.words.join(" ")}"</p>}
      {checked && (
        <p className={`reo-feedback ${correct ? "good" : "oops"}`}>
          {correct ? "✅ Tika! Perfect order." : `❌ Not quite — it's "${task.words.join(" ")}"`}
        </p>
      )}
    </div>
  );
}

function ReoTalkTask({ task, registerKeyHandler, showEnglish }) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => setShowHint(false), [task.id]);

  useEffect(() => {
    return registerKeyHandler((e) => {
      const key = e.key.toLowerCase();
      if (key === "h") setShowHint((s) => !s);
      if (key === "p") speakMaori(task.prompt.mi);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  return (
    <div className="reo-task">
      <span className="reo-task-kind">🗣️ Talk about it</span>
      <ReoVisual visual={{ type: "icon", emoji: task.prompt.emoji }} />
      <h1 className="title-en">{task.prompt.mi}</h1>
      {showEnglish && <h2 className="title-hi">{task.prompt.en}</h2>}
      <div className="reo-task-footer">
        <PronounceButton text={task.prompt.mi} keyLabel />
        {task.prompt.hint && (
          <button className="reo-hint-btn" onClick={() => setShowHint((s) => !s)}>💡 Hint <span className="reo-key-badge">H</span></button>
        )}
      </div>
      {showHint && task.prompt.hint && <p className="reo-hint-text">💡 {task.prompt.hint}</p>}
    </div>
  );
}

function ReoCategorySelector({ selected, setSelected }) {
  function toggle(code) {
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  }
  return (
    <div className="reo-category-block">
      <div className="reo-category-grid" role="group" aria-label="Real-life categories">
        {Object.entries(REO_CATEGORIES).map(([code, meta]) => (
          <button
            key={code}
            className={`age-option reo-category-pill ${selected.includes(code) ? "active" : ""}`}
            onClick={() => toggle(code)}
            aria-pressed={selected.includes(code)}
          >
            {selected.includes(code) ? "✓ " : ""}{meta.label}
          </button>
        ))}
      </div>
      <div className="reo-category-actions">
        <button className="reo-mini-btn" onClick={() => setSelected(Object.keys(REO_CATEGORIES))}>Select All</button>
        <button className="reo-mini-btn" onClick={() => setSelected([])}>Clear</button>
      </div>
    </div>
  );
}

function ReoLevelSelector({ level, setLevel }) {
  return (
    <div className="age-selector" role="group" aria-label="Reo practice level">
      {Object.entries(REO_LEVEL_META).map(([code, meta]) => (
        <button key={code} className={`age-option ${level === code ? "active" : ""}`} onClick={() => setLevel(code)}>
          {meta.label}
        </button>
      ))}
    </div>
  );
}

function buildReoTaskPool(categories, level) {
  const topicIds = new Set();
  categories.forEach((c) => (REO_CATEGORIES[c]?.topics || []).forEach((t) => topicIds.add(t)));
  if (topicIds.size === 0) return [];
  const seen = new Set();
  const pool = [];
  topicIds.forEach((t) => {
    REO_TOPICS[t].generate(level).forEach((task) => {
      if (!seen.has(task.id)) { seen.add(task.id); pool.push(task); }
    });
  });
  return shuffle(pool);
}

function ReoPracticeScreen({ onHome }) {
  const [categories, setCategories] = useState(["everyday"]);
  const [level, setLevel] = useState("starter");
  const [tasks, setTasks] = useState(() => buildReoTaskPool(["everyday"], "starter"));
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [showStudentInfo, setShowStudentInfo] = useState(false);
  const [showEnglish, setShowEnglish] = useState(true);
  const keyHandlerRef = React.useRef(null);

  useEffect(() => {
    setTasks(buildReoTaskPool(categories, level));
    setIndex(0);
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.join(","), level]);

  const total = tasks.length;
  const current = tasks[index];

  function advance() {
    setAnimKey((k) => k + 1);
    setIndex((i) => (i + 1 < tasks.length ? i + 1 : i));
  }
  function goNext() { advance(); }
  function goBack() {
    setAnimKey((k) => k + 1);
    setIndex((i) => Math.max(0, i - 1));
  }
  function reshuffle() {
    setTasks(buildReoTaskPool(categories, level));
    setIndex(0);
    setAnimKey((k) => k + 1);
  }

  // Lightweight adaptive repetition: a wrong answer re-inserts the same task
  // a few places ahead so it comes back around sooner; correct answers just move on.
  function handleAnswered(isCorrect) {
    if (isCorrect) return;
    setTasks((t) => {
      const copy = [...t];
      const reinsertAt = Math.min(index + 3, copy.length);
      copy.splice(reinsertAt, 0, { ...current, id: `${current.id}-retry-${Date.now()}` });
      return copy;
    });
  }

  function registerKeyHandler(fn) {
    keyHandlerRef.current = fn;
    return () => { if (keyHandlerRef.current === fn) keyHandlerRef.current = null; };
  }

  useEffect(() => {
    function handleKey(e) {
      const key = e.key.toLowerCase();
      if (key === "arrowright" || key === "n") { e.preventDefault(); goNext(); return; }
      if (key === "arrowleft" || key === "b") { e.preventDefault(); goBack(); return; }
      if (key === "s") { e.preventDefault(); reshuffle(); return; }
      if (keyHandlerRef.current) keyHandlerRef.current(e);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tasks, categories, level]);

  return (
    <div className="game-screen">
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <Logo onClick={onHome} />
      </div>

      <p className="reo-tagline">Kōrero Reo — choose your capability and real-life categories, then start.</p>
      <ReoLevelSelector level={level} setLevel={setLevel} />
      <div style={{ height: 12 }} />
      <ReoCategorySelector selected={categories} setSelected={setCategories} />

      <button className={`reo-english-toggle ${showEnglish ? "on" : ""}`} onClick={() => setShowEnglish((s) => !s)} aria-pressed={showEnglish}>
        <span className="reo-english-toggle-dot" />
        {showEnglish ? "🇬🇧 English translation: On" : "🇬🇧 English translation: Off"}
      </button>

      {total === 0 ? (
        <div className="game-card">
          <p className="reo-english-hint">Select at least one category above to start practising.</p>
        </div>
      ) : (
        <>
          <div className="game-card" key={animKey}>
            {current.kind === "finisher" && <ReoFinisherTask task={current} registerKeyHandler={registerKeyHandler} onAnswered={handleAnswered} showEnglish={showEnglish} />}
            {current.kind === "builder" && <ReoBuilderTask task={current} registerKeyHandler={registerKeyHandler} onAnswered={handleAnswered} showEnglish={showEnglish} />}
            {current.kind === "talk" && <ReoTalkTask task={current} registerKeyHandler={registerKeyHandler} showEnglish={showEnglish} />}
          </div>

          <div className="nav-bar">
            <button className="btn btn-secondary" onClick={goBack} disabled={index === 0} aria-label="Previous">← Back <span className="reo-key-badge">B</span></button>
            <div className="progress" aria-live="polite">Task {index + 1} / {total}</div>
            <button className="btn btn-primary" onClick={goNext} aria-label="Next">Next → <span className="reo-key-badge">N</span></button>
          </div>

          <div className="shuffle-row">
            <button className="btn btn-secondary shuffle-btn" onClick={reshuffle}>🔀 Shuffle <span className="reo-key-badge">S</span></button>
          </div>

          <p className="reo-keys-legend">
            ⌨️ Keyboard: A–E select an answer · 1–9 add a word tile · Backspace undoes · Enter checks ·
            H = hint · P = pronounce · N/→ = next · B/← = back · S = shuffle
          </p>
        </>
      )}

      <button className="student-mode-card" onClick={() => setShowStudentInfo((s) => !s)}>
        <span className="student-mode-badge">Coming Soon</span>
        <span className="student-mode-title">🎓 Student Mode</span>
        <span className="student-mode-desc">A simpler, self-directed practice experience just for tamariki — see, hear, speak, build, repeat.</span>
      </button>
    </div>
  );
}

/* ===================== TUTOR ZONE / ZONA DE TUTORÍA ===================== */
/* Colombian Spanish practice. Every UI label: English line, Spanish line directly beneath. */

const TZ_LEVELS = {
  A1: { es: "Principiante", en: "Beginner", code: "A1" },
  A2: { es: "Elemental", en: "Elementary", code: "A2" },
  B1: { es: "Intermedio", en: "Intermediate", code: "B1" },
  B2: { es: "Intermedio alto", en: "Upper intermediate", code: "B2" },
};

const TZ_CATS = {
  personal: { emoji: "🙋", es: "Personal", en: "Personal" },
  travel: { emoji: "✈️", es: "Viajes", en: "Travel" },
  tech: { emoji: "💻", es: "Tecnología", en: "Technology" },
  sports: { emoji: "🚴", es: "Deportes y aire libre", en: "Sports & Outdoors" },
  food: { emoji: "🍽️", es: "Comida y salir", en: "Food & Going Out" },
};

// fill: [emoji, sentence with ___, English, options, correctIndex]
// build: [emoji, Spanish sentence, English]   talk: [emoji, Spanish question, English]
const TZ_DATA = {
  personal: {
    note: { es: "Nota colombiana: en Colombia mucha gente usa “usted” incluso con amigos o familia. “Tú” es común en la costa y entre jóvenes, y en algunas regiones andinas se usa “vos”. Si dudas, usa “usted”.", en: "Colombian note: in Colombia many people use “usted” even with friends or family. “Tú” is common on the coast and among young people, and “vos” is used in some Andean regions. If in doubt, use “usted”." },
    A1: {
      fill: [["🙋","Hola, me ___ Camila.","Hi, my name is Camila.",["llamo","llamas","llama"],0],["🎂","Yo ___ diez años.","I am ten years old.",["tengo","soy","estoy"],0]],
      build: [["👋","Mucho gusto en conocerte","Nice to meet you"]],
      talk: [["🙋","¿Cómo te llamas y de dónde eres?","What is your name and where are you from?"]],
    },
    A2: {
      fill: [["🏠","Yo ___ en Christchurch con mi familia.","I live in Christchurch with my family.",["vivo","vive","vives"],0],["⏰","Me ___ a las siete de la mañana.","I get up at seven in the morning.",["levanto","levantas","levanta"],0]],
      build: [["👨‍👩‍👧","Tengo dos hermanos y una hermana","I have two brothers and one sister"]],
      talk: [["📅","¿Cómo es un día normal para ti?","What is a normal day like for you?"]],
    },
    B1: {
      fill: [["🎓","Cuando era niño, ___ en el campo.","When I was a child, I lived in the countryside.",["vivía","viví","viviré"],0],["💭","Si tuviera más tiempo, ___ más.","If I had more time, I would read more.",["leería","leí","leeré"],0]],
      build: [["🌱","Me gustaría aprender algo nuevo cada año","I would like to learn something new every year"]],
      talk: [["💬","Cuéntame algo que te haya sorprendido esta semana.","Tell me something that has surprised you this week."]],
    },
    B2: {
      fill: [["🧠","Aunque ___ cansado, fui al gimnasio.","Although I was tired, I went to the gym.",["estaba","esté","estuve"],0],["🔮","Espero que mis hijos ___ felices en el futuro.","I hope my children are happy in the future.",["sean","son","serán"],0]],
      build: [["🤔","Si pudiera cambiar algo de mi vida, cambiaría mi rutina","If I could change something in my life, I would change my routine"]],
      talk: [["🗣️","¿Qué opinas de la idea de que la personalidad cambia con los años?","What do you think of the idea that personality changes over the years?"]],
    },
  },
  travel: {
    note: { es: "Nota colombiana: para el billete de viaje se dice “tiquete” (o “pasaje”), “carro” para el coche, y “bus” o “buseta” para el transporte urbano.", en: "Colombian note: for a travel ticket people say “tiquete” (or “pasaje”), “carro” for car, and “bus” or “buseta” for city transport." },
    A1: {
      fill: [["🧳","Quiero ___ tiquete, por favor.","I want a ticket, please.",["un","una","unas"],0],["🏨","¿Dónde ___ el hotel?","Where is the hotel?",["está","es","están"],0]],
      build: [["🚌","¿Dónde está la estación de bus?","Where is the bus station?"]],
      talk: [["🗺️","¿A qué ciudad de Colombia te gustaría viajar?","Which city in Colombia would you like to travel to?"]],
    },
    A2: {
      fill: [["✈️","El vuelo ___ a las ocho de la noche.","The flight leaves at eight at night.",["sale","salgo","salen"],0],["🏖️","El año pasado ___ a Cartagena.","Last year I went to Cartagena.",["fui","voy","iba"],0]],
      build: [["🏨","Quisiera reservar una habitación para dos noches","I would like to book a room for two nights"]],
      talk: [["🌎","¿Qué lugar te gustaría visitar y por qué?","What place would you like to visit and why?"]],
    },
    B1: {
      fill: [["🧭","Cuando llegamos al aeropuerto, el vuelo ya ___.","When we got to the airport, the flight had already left.",["había salido","salió","salía"],0],["🎒","Si viajo a Colombia, ___ el Eje Cafetero.","If I travel to Colombia, I will visit the Coffee Region.",["visitaré","visité","visitaría"],0]],
      build: [["📍","Me perdí y tuve que pedir indicaciones","I got lost and had to ask for directions"]],
      talk: [["🧳","Cuéntame sobre el mejor viaje que hayas hecho.","Tell me about the best trip you have taken."]],
    },
    B2: {
      fill: [["🌋","Habría disfrutado más el viaje si ___ mejor el itinerario.","I would have enjoyed the trip more if I had planned the itinerary better.",["hubiera planeado","planeé","planeaba"],0],["🛂","Es probable que el vuelo se ___ por el clima.","The flight will probably be delayed because of the weather.",["retrase","retrasa","retrasará"],0]],
      build: [["🌍","Viajar te permite entender otras culturas","Travelling lets you understand other cultures"]],
      talk: [["⚖️","¿Qué ventajas y desventajas tiene el turismo masivo?","What are the advantages and disadvantages of mass tourism?"]],
    },
  },
  tech: {
    note: { es: "Nota colombiana: se dice “celular” (no “móvil”), “computador” y “clave” (o “contraseña”).", en: "Colombian note: people say “celular” (not “móvil”), “computador” and “clave” (or “contraseña”)." },
    A1: {
      fill: [["📱","Mi ___ es nuevo.","My mobile phone is new.",["celular","carro","tinto"],0],["💻","Tengo un ___ en mi casa.","I have a computer at home.",["computador","tenedor","zapato"],0]],
      build: [["📶","¿Cuál es la clave del wifi?","What is the wifi password?"]],
      talk: [["📱","¿Qué aplicaciones usas todos los días?","What apps do you use every day?"]],
    },
    A2: {
      fill: [["💬","Te ___ un mensaje por WhatsApp.","I am sending you a message on WhatsApp.",["envío","envías","envía"],0],["🔋","Mi celular no ___ batería.","My phone has no battery.",["tiene","tengo","tienes"],0]],
      build: [["📸","Me gusta tomar fotos con mi celular","I like taking photos with my phone"]],
      talk: [["🎮","¿Qué haces en tu tiempo libre con tu celular o tu computador?","What do you do in your free time with your phone or computer?"]],
    },
    B1: {
      fill: [["🔒","Hay que ___ la clave cada tres meses.","You have to change the password every three months.",["cambiar","cambio","cambió"],0],["📡","Ayer el internet ___ todo el día.","Yesterday the internet was down all day.",["falló","fallaba","fallará"],0]],
      build: [["🤖","La inteligencia artificial está cambiando el trabajo","Artificial intelligence is changing work"]],
      talk: [["📵","¿Crees que pasamos demasiado tiempo frente a las pantallas?","Do you think we spend too much time in front of screens?"]],
    },
    B2: {
      fill: [["🛡️","Es fundamental que las empresas ___ los datos personales.","It is essential that companies protect personal data.",["protejan","protegen","protegerán"],0],["🧩","Si no hubiera redes sociales, la gente ___ más tiempo libre.","If there were no social media, people would have more free time.",["tendría","tiene","tendrá"],0]],
      build: [["⚖️","Debería existir una regulación más clara sobre la privacidad digital","There should be clearer regulation about digital privacy"]],
      talk: [["🔮","¿Cómo imaginas la tecnología dentro de veinte años?","How do you imagine technology in twenty years’ time?"]],
    },
  },
  sports: {
    note: { es: "Nota colombiana: en Bogotá, la ciclovía cierra calles principales los domingos y festivos para que la gente monte en bicicleta, camine y haga ejercicio.", en: "Colombian note: in Bogotá, the ciclovía closes main streets on Sundays and public holidays so people can cycle, walk and exercise." },
    A1: {
      fill: [["⚽","Me gusta jugar ___ fútbol.","I like playing football.",["al","a la","el"],0],["🏃","Yo ___ por la mañana.","I run in the morning.",["corro","corre","corres"],0]],
      build: [["🚴","Me gusta montar en bicicleta","I like riding a bike"]],
      talk: [["🏅","¿Qué deporte te gusta más?","Which sport do you like most?"]],
    },
    A2: {
      fill: [["🥾","El domingo ___ a caminar por la montaña.","On Sunday we are going walking in the mountains.",["vamos","van","voy"],0],["🏊","Ayer ___ en la piscina por una hora.","Yesterday I swam in the pool for an hour.",["nadé","nado","nadaba"],0]],
      build: [["🏞️","Prefiero hacer deporte al aire libre","I prefer to exercise outdoors"]],
      talk: [["🌄","¿Qué actividades al aire libre haces en Nueva Zelanda?","What outdoor activities do you do in New Zealand?"]],
    },
    B1: {
      fill: [["🏆","Cuando era joven, ___ fútbol todos los fines de semana.","When I was young I played football every weekend.",["jugaba","jugué","jugaré"],0],["🦵","Me lesioné la rodilla mientras ___.","I hurt my knee while I was running.",["corría","corrí","correré"],0]],
      build: [["🏔️","Subir una montaña requiere preparación y paciencia","Climbing a mountain takes preparation and patience"]],
      talk: [["🇨🇴","¿Qué sabes del ciclismo en Colombia?","What do you know about cycling in Colombia?"]],
    },
    B2: {
      fill: [["🏅","Si hubiéramos entrenado más, ___ el partido.","If we had trained more, we would have won the match.",["habríamos ganado","ganamos","ganaríamos"],0],["🌲","Es importante que los turistas ___ la naturaleza.","It is important that tourists respect nature.",["respeten","respetan","respetarán"],0]],
      build: [["⛰️","El senderismo me ayuda a desconectarme del estrés diario","Hiking helps me disconnect from daily stress"]],
      talk: [["💪","¿Deberían los colegios dar más importancia al deporte? ¿Por qué?","Should schools give more importance to sport? Why?"]],
    },
  },
  food: {
    note: { es: "Nota colombiana: el “mesero” te atiende en el restaurante, el “tinto” es un café negro, y para pagar se dice “La cuenta, por favor”. La propina a veces ya viene incluida: revisa la cuenta.", en: "Colombian note: the “mesero” is the waiter, “tinto” is a black coffee, and to pay you say “La cuenta, por favor”. The tip is sometimes already included: check the bill." },
    A1: {
      fill: [["☕","Quiero un ___, por favor.","I would like a black coffee, please.",["tinto","lápiz","tiquete"],0],["🍽️","La ___, por favor.","The bill, please.",["cuenta","cuento","cuerda"],0]],
      build: [["🥟","Quisiera una empanada y un jugo","I would like an empanada and a juice"]],
      talk: [["🍲","¿Cuál es tu comida favorita?","What is your favourite food?"]],
    },
    A2: {
      fill: [["🧑‍🍳","¿Me ___ el menú, por favor?","Could you bring me the menu, please?",["trae","traigo","traes"],0],["🥗","Yo no ___ carne, soy vegetariano.","I don’t eat meat, I am vegetarian.",["como","comes","come"],0]],
      build: [["🍽️","Una mesa para cuatro personas, por favor","A table for four people, please"]],
      talk: [["🥘","¿Qué sueles pedir cuando sales a comer?","What do you usually order when you go out to eat?"]],
    },
    B1: {
      fill: [["🍴","Ayer ___ en un restaurante muy bueno.","Yesterday we ate at a very good restaurant.",["comimos","comíamos","comeremos"],0],["👨‍🍳","Me recomendó que ___ el ajiaco.","He recommended that I try the ajiaco.",["probara","pruebo","probé"],0]],
      build: [["📋","¿Qué me recomienda del menú de hoy?","What do you recommend from today’s menu?"]],
      talk: [["🇨🇴","¿Qué platos colombianos has probado o te gustaría probar?","Which Colombian dishes have you tried or would you like to try?"]],
    },
    B2: {
      fill: [["🍷","Si hubiera sabido que estaba lleno, ___ una reserva.","If I had known it was full, I would have made a reservation.",["habría hecho","hice","haría"],0],["🍰","El servicio fue tan lento que ___ quejarnos.","The service was so slow that we had to complain.",["tuvimos que","teníamos","tengamos"],0]],
      build: [["🌮","La comida es una parte importante de la identidad cultural","Food is an important part of cultural identity"]],
      talk: [["🥦","¿Crees que la gente come mejor hoy que hace cincuenta años? ¿Por qué?","Do you think people eat better today than fifty years ago? Why?"]],
    },
  },
};

function buildTutorPool(cats, level) {
  const pool = [];
  cats.forEach((c) => {
    const d = TZ_DATA[c];
    if (!d || !d[level]) return;
    d[level].fill.forEach((f, i) => {
      const opts = shuffle(f[3].map((label, k) => ({ id: `${c}${level}f${i}o${k}`, label })));
      pool.push({ id: `${c}-${level}-fill-${i}`, kind: "finisher", cat: c, visual: { type: "icon", emoji: f[0] }, promptEs: f[1], promptEn: f[2], options: opts, correctId: `${c}${level}f${i}o${f[4]}`, answer: f[3][f[4]] });
    });
    d[level].build.forEach((b, i) => pool.push({ id: `${c}-${level}-build-${i}`, kind: "builder", cat: c, visual: { type: "icon", emoji: b[0] }, words: b[1].split(" "), promptEn: b[2] }));
    d[level].talk.forEach((t, i) => pool.push({ id: `${c}-${level}-talk-${i}`, kind: "talk", cat: c, emoji: t[0], es: t[1], en: t[2] }));
  });
  const shuffled = shuffle(pool);
  // one cultural note per chosen category, placed at random spots
  cats.forEach((c) => {
    if (TZ_DATA[c]) shuffled.splice(Math.floor(Math.random() * (shuffled.length + 1)), 0, { id: `${c}-${level}-note`, kind: "note", cat: c, note: TZ_DATA[c].note });
  });
  return shuffled;
}

function speakSpanish(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((x) => /^es[-_]?CO/i.test(x.lang)) || voices.find((x) => /^es[-_]?(419|MX|US|AR)/i.test(x.lang)) || voices.find((x) => /^es/i.test(x.lang));
  if (v) { utter.voice = v; utter.lang = v.lang; } else { utter.lang = "es-CO"; }
  utter.rate = 0.82;
  window.speechSynthesis.speak(utter);
}

// Bilingual label: English line, Spanish line directly underneath. Spanish-only mode hides English.
function Bi({ en, es, mode, className }) {
  return (
    <span className={`bi ${className || ""}`}>
      {mode !== "es" && <span className="bi-en">{en}</span>}
      <span className={`bi-es ${mode === "es" ? "solo" : ""}`}>{es}</span>
    </span>
  );
}

function TzSpeak({ text, mode }) {
  return (
    <button className="reo-pronounce-btn" onClick={() => speakSpanish(text)} title="Listen / Escuchar (P)">
      🔊 <span className="reo-key-badge">P</span> <Bi mode={mode} en="Listen" es="Escuchar" />
    </button>
  );
}

function TzHintBtn({ mode, onClick }) {
  return (
    <button className="reo-hint-btn" onClick={onClick}>
      💡 <span className="reo-key-badge">H</span> <Bi mode={mode} en="Hint" es="Pista" />
    </button>
  );
}

function TzFinisher({ task, registerKeyHandler, onAnswered, mode }) {
  const [selected, setSelected] = useState(null);
  const [showHint, setShowHint] = useState(false);
  function choose(opt) {
    if (selected) return;
    setSelected(opt);
    if (onAnswered) onAnswered(opt.id === task.correctId);
  }
  useEffect(() => { setSelected(null); setShowHint(false); }, [task.id]);
  useEffect(() => {
    return registerKeyHandler((e) => {
      const key = e.key.toLowerCase();
      if (key === "h") { setShowHint((s) => !s); return; }
      if (key === "p") { speakSpanish(task.promptEs.replace("___", task.answer)); return; }
      const idx = OPTION_KEYS.indexOf(key);
      if (idx !== -1 && task.options[idx]) choose(task.options[idx]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, selected]);
  const answered = !!selected;
  const isCorrect = answered && selected.id === task.correctId;
  const [before, after] = task.promptEs.split("___");
  return (
    <div className="reo-task">
      <span className="reo-task-kind">💬 <Bi mode={mode} en="Finish the sentence" es="Completa la frase" /></span>
      <ReoVisual visual={task.visual} />
      <h1 className="reo-sentence">{before}<span className="reo-blank">{answered ? selected.label : "___"}</span>{after}</h1>
      {mode !== "es" && <p className="reo-english-hint">{task.promptEn}</p>}
      <div className="reo-options">
        {task.options.map((opt, i) => (
          <button key={opt.id} className={`reo-option ${answered && opt.id === selected.id ? (isCorrect ? "correct" : "incorrect") : ""} ${answered && opt.id === task.correctId && !isCorrect ? "reveal-correct" : ""}`} onClick={() => choose(opt)} disabled={answered}>
            <span className="reo-key-badge">{OPTION_KEYS[i].toUpperCase()}</span> {opt.label}
          </button>
        ))}
      </div>
      <div className="reo-task-footer">
        <TzSpeak text={task.promptEs.replace("___", task.answer)} mode={mode} />
        <TzHintBtn mode={mode} onClick={() => setShowHint((s) => !s)} />
      </div>
      {showHint && !answered && (
        <p className="reo-hint-text">💡 <Bi mode={mode} en={`It starts with “${task.answer[0]}” and has ${task.answer.length} letters.`} es={`Empieza con “${task.answer[0]}” y tiene ${task.answer.length} letras.`} /></p>
      )}
      {answered && (
        <p className={`reo-feedback ${isCorrect ? "good" : "oops"}`}>
          {isCorrect ? <>✅ <Bi mode={mode} en="Correct!" es="¡Correcto!" /></> : <>❌ <Bi mode={mode} en={`Not quite — it’s “${task.answer}”.`} es={`Casi — es “${task.answer}”.`} /></>}
        </p>
      )}
    </div>
  );
}

function TzBuilder({ task, registerKeyHandler, onAnswered, mode }) {
  const mk = () => shuffle(task.words.map((w, i) => ({ word: w, key: i })));
  const [bank, setBank] = useState(mk);
  const [answer, setAnswer] = useState([]);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  useEffect(() => { setBank(mk()); setAnswer([]); setChecked(false); setShowHint(false); /* eslint-disable-next-line */ }, [task.id]);
  function addToAnswer(tile) { if (checked || !tile) return; setAnswer((a) => [...a, tile]); setBank((b) => b.filter((t) => t.key !== tile.key)); }
  function removeLast() { if (checked || answer.length === 0) return; const t = answer[answer.length - 1]; setAnswer((a) => a.slice(0, -1)); setBank((b) => [...b, t]); }
  function removeFromAnswer(tile) { if (checked) return; setAnswer((a) => a.filter((t) => t.key !== tile.key)); setBank((b) => [...b, tile]); }
  function handleDrop(e) { e.preventDefault(); if (checked) return; const key = Number(e.dataTransfer.getData("text/plain")); addToAnswer(bank.find((t) => t.key === key)); }
  function check() {
    const ok = answer.map((t) => t.word).join(" ") === task.words.join(" ");
    setCorrect(ok); setChecked(true); if (onAnswered) onAnswered(ok);
  }
  function reset() { setBank(mk()); setAnswer([]); setChecked(false); }
  useEffect(() => {
    return registerKeyHandler((e) => {
      const key = e.key.toLowerCase();
      if (key === "h") { setShowHint((s) => !s); return; }
      if (key === "p") { speakSpanish(task.words.join(" ")); return; }
      if (key === "r") { reset(); return; }
      if (key === "backspace") { removeLast(); return; }
      if (key === "enter") { if (bank.length === 0) check(); return; }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= bank.length) addToAnswer(bank[num - 1]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, bank, answer, checked]);
  const full = task.words.join(" ");
  return (
    <div className="reo-task">
      <span className="reo-task-kind">🧩 <Bi mode={mode} en="Build the sentence" es="Construye la frase" /></span>
      <ReoVisual visual={task.visual} />
      {mode !== "es" && <p className="reo-english-hint">{task.promptEn}</p>}
      <div className="reo-answer-row" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        {answer.length === 0 && <span className="reo-answer-placeholder"><Bi mode={mode} en="Tap, drag, or press number keys to add words in order" es="Toca, arrastra o pulsa los números para poner las palabras en orden" /></span>}
        {answer.map((tile) => (<button key={tile.key} className="reo-tile answer" onClick={() => removeFromAnswer(tile)}>{tile.word}</button>))}
      </div>
      <div className="reo-word-bank">
        {bank.map((tile, i) => (
          <button key={tile.key} className="reo-tile" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(tile.key))} onClick={() => addToAnswer(tile)}>
            <span className="reo-key-badge small">{i + 1}</span> {tile.word}
          </button>
        ))}
      </div>
      <div className="reo-builder-buttons">
        <button className="btn btn-secondary" onClick={reset} disabled={answer.length === 0}>↺ <span className="reo-key-badge">R</span> <Bi mode={mode} en="Reset" es="Reiniciar" /></button>
        <button className="btn btn-primary" onClick={check} disabled={checked || bank.length > 0}>✓ <span className="reo-key-badge">⏎</span> <Bi mode={mode} en="Check" es="Comprobar" /></button>
      </div>
      <div className="reo-task-footer">
        <TzSpeak text={full} mode={mode} />
        <TzHintBtn mode={mode} onClick={() => setShowHint((s) => !s)} />
      </div>
      {showHint && <p className="reo-hint-text">💡 <Bi mode={mode} en={`Full sentence: “${full}”`} es={`Frase completa: “${full}”`} /></p>}
      {checked && (
        <p className={`reo-feedback ${correct ? "good" : "oops"}`}>
          {correct ? <>✅ <Bi mode={mode} en="Perfect order!" es="¡Orden perfecto!" /></> : <>❌ <Bi mode={mode} en={`Not quite — it’s “${full}”`} es={`Casi — es “${full}”`} /></>}
        </p>
      )}
    </div>
  );
}

function TzTalk({ task, registerKeyHandler, mode }) {
  useEffect(() => registerKeyHandler((e) => { if (e.key.toLowerCase() === "p") speakSpanish(task.es); }), [task]); // eslint-disable-line
  return (
    <div className="reo-task">
      <span className="reo-task-kind">🗣️ <Bi mode={mode} en="Talk about it with your tutor" es="Conversa con tu tutor" /></span>
      <ReoVisual visual={{ type: "icon", emoji: task.emoji }} />
      <h1 className="title-en">{task.es}</h1>
      {mode !== "es" && <h2 className="title-hi">{task.en}</h2>}
      <div className="reo-task-footer"><TzSpeak text={task.es} mode={mode} /></div>
    </div>
  );
}

function TzNote({ task, mode }) {
  return (
    <div className="reo-task">
      <span className="reo-task-kind">🇨🇴 <Bi mode={mode} en="Colombian Spanish tip" es="Dato del español de Colombia" /></span>
      <ReoVisual visual={{ type: "icon", emoji: "🇨🇴" }} />
      <h2 className="title-en" style={{ fontSize: 22 }}>{task.note.es}</h2>
      {mode !== "es" && <h2 className="title-hi">{task.note.en}</h2>}
    </div>
  );
}

function TutorZoneScreen({ onHome }) {
  const [step, setStep] = useState("hub"); // hub | spanish
  const [mode, setMode] = useState("both"); // both | es
  const [level, setLevel] = useState("A1");
  const [cats, setCats] = useState(["personal"]);
  const [tasks, setTasks] = useState(() => buildTutorPool(["personal"], "A1"));
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const keyRef = React.useRef(null);

  useEffect(() => { setTasks(buildTutorPool(cats, level)); setIndex(0); setAnimKey((k) => k + 1); /* eslint-disable-next-line */ }, [cats.join(","), level]);

  const total = tasks.length;
  const current = tasks[index];
  function goNext() { setAnimKey((k) => k + 1); setIndex((i) => (i + 1 < tasks.length ? i + 1 : i)); }
  function goBack() { setAnimKey((k) => k + 1); setIndex((i) => Math.max(0, i - 1)); }
  function reshuffle() { setTasks(buildTutorPool(cats, level)); setIndex(0); setAnimKey((k) => k + 1); }
  function handleAnswered(ok) {
    if (ok) return;
    setTasks((t) => { const c = [...t]; c.splice(Math.min(index + 3, c.length), 0, { ...current, id: `${current.id}-retry-${Date.now()}` }); return c; });
  }
  function registerKeyHandler(fn) { keyRef.current = fn; return () => { if (keyRef.current === fn) keyRef.current = null; }; }

  useEffect(() => {
    if (step !== "spanish") return undefined;
    function handleKey(e) {
      const key = e.key.toLowerCase();
      if (key === "arrowright" || key === "n") { e.preventDefault(); goNext(); return; }
      if (key === "arrowleft" || key === "b") { e.preventDefault(); goBack(); return; }
      if (key === "s") { e.preventDefault(); reshuffle(); return; }
      if (keyRef.current) keyRef.current(e);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, index, tasks, cats, level]);

  function toggleCat(c) { setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c])); }

  const modeToggle = (
    <button className={`reo-english-toggle ${mode === "both" ? "on" : ""}`} onClick={() => setMode((m) => (m === "both" ? "es" : "both"))} aria-pressed={mode === "both"}>
      <span className="reo-english-toggle-dot" />
      <span className="bi">
        {mode === "both" ? <><span className="bi-en">🇬🇧 Spanish + English</span><span className="bi-es">🇨🇴 Español + inglés</span></> : <span className="bi-es solo">🇨🇴 Solo español</span>}
      </span>
    </button>
  );

  if (step === "hub") {
    return (
      <div className="game-screen">
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><Logo onClick={onHome} /></div>
        <h1 className="title-en"><Bi mode={mode} en="🎓 Tutor Zone" es="🎓 Zona de Tutoría" /></h1>
        <p className="reo-tagline"><Bi mode={mode} en="Choose what you want to learn." es="Elige qué quieres aprender." /></p>
        {modeToggle}
        <div className="category-grid" style={{ marginTop: 16 }}>
          <button className="reo-launch-btn tutor-launch-btn" onClick={() => setStep("spanish")}>
            <span className="reo-launch-emoji">🇨🇴</span>
            <span className="reo-launch-text">
              <span className="reo-launch-title"><Bi mode={mode} en="Language Learning — Spanish" es="Aprendizaje de idiomas — Español" /></span>
              <span className="reo-launch-desc"><Bi mode={mode} en="Colombian Spanish for your tutor sessions. 5 topics, levels A1–B2." es="Español de Colombia para tus clases con el tutor. 5 temas, niveles A1–B2." /></span>
            </span>
          </button>
        </div>
        <div className="shuffle-row">
          <button className="btn btn-secondary" onClick={onHome}>← <Bi mode={mode} en="Back to Timefillers" es="Volver a Timefillers" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-screen">
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <Logo onClick={onHome} />
      </div>
      <h1 className="title-en"><Bi mode={mode} en="🇨🇴 Spanish — Colombian Spanish" es="🇨🇴 Español — español de Colombia" /></h1>
      <p className="reo-tagline"><Bi mode={mode} en="1. Pick your level. 2. Pick topics. 3. Practise." es="1. Elige tu nivel. 2. Elige los temas. 3. Practica." /></p>

      <div className="age-selector" role="group" aria-label="Nivel / Level">
        {Object.entries(TZ_LEVELS).map(([code, m]) => (
          <button key={code} className={`age-option ${level === code ? "active" : ""}`} onClick={() => setLevel(code)}>
            {code} · <Bi mode={mode} en={m.en} es={m.es} />
          </button>
        ))}
      </div>
      <div style={{ height: 12 }} />
      <div className="reo-category-block">
        <div className="reo-category-grid" role="group" aria-label="Temas / Topics">
          {Object.entries(TZ_CATS).map(([code, m]) => (
            <button key={code} className={`age-option reo-category-pill ${cats.includes(code) ? "active" : ""}`} onClick={() => toggleCat(code)} aria-pressed={cats.includes(code)}>
              {cats.includes(code) ? "✓ " : ""}{m.emoji} <Bi mode={mode} en={m.en} es={m.es} />
            </button>
          ))}
        </div>
        <div className="reo-category-actions">
          <button className="reo-mini-btn" onClick={() => setCats(Object.keys(TZ_CATS))}><Bi mode={mode} en="Select All" es="Elegir todo" /></button>
          <button className="reo-mini-btn" onClick={() => setCats([])}><Bi mode={mode} en="Clear" es="Borrar" /></button>
        </div>
      </div>
      {modeToggle}

      {total === 0 ? (
        <div className="game-card"><p className="reo-english-hint"><Bi mode={mode} en="Select at least one topic above to start." es="Elige al menos un tema arriba para empezar." /></p></div>
      ) : (
        <>
          <div className="game-card" key={animKey}>
            {current.kind === "finisher" && <TzFinisher task={current} registerKeyHandler={registerKeyHandler} onAnswered={handleAnswered} mode={mode} />}
            {current.kind === "builder" && <TzBuilder task={current} registerKeyHandler={registerKeyHandler} onAnswered={handleAnswered} mode={mode} />}
            {current.kind === "talk" && <TzTalk task={current} registerKeyHandler={registerKeyHandler} mode={mode} />}
            {current.kind === "note" && <TzNote task={current} mode={mode} />}
          </div>
          <div className="nav-bar">
            <button className="btn btn-secondary" onClick={goBack} disabled={index === 0}>← <span className="reo-key-badge">B</span> <Bi mode={mode} en="Back" es="Atrás" /></button>
            <div className="progress" aria-live="polite"><Bi mode={mode} en={`Task ${index + 1} / ${total}`} es={`Tarea ${index + 1} / ${total}`} /></div>
            <button className="btn btn-primary" onClick={goNext}><Bi mode={mode} en="Next" es="Siguiente" /> <span className="reo-key-badge">N</span> →</button>
          </div>
          <div className="shuffle-row">
            <button className="btn btn-secondary shuffle-btn" onClick={reshuffle}>🔀 <span className="reo-key-badge">S</span> <Bi mode={mode} en="Shuffle" es="Mezclar" /></button>
            <button className="btn btn-secondary" onClick={() => setStep("hub")}>← <Bi mode={mode} en="Tutor Zone menu" es="Menú de Tutoría" /></button>
          </div>
          <p className="reo-keys-legend">
            ⌨️ <Bi mode={mode}
              en="A–E answer · 1–9 add a word · Backspace undo · Enter check · H hint · P listen · N/→ next · B/← back · S shuffle"
              es="A–E responder · 1–9 añadir palabra · Retroceso deshacer · Enter comprobar · H pista · P escuchar · N/→ siguiente · B/← atrás · S mezclar" />
          </p>
        </>
      )}
    </div>
  );
}


const CATEGORIES = [
  {
    id: "weird",
    emoji: "🌀",
    title: "Weird & Wonderful",
    description: "Strange little mysteries to puzzle over together.",
    descTranslations: { hi: "साथ में सोचने के लिए अजीब छोटी पहेलियाँ।", es: "Pequeños misterios extraños para resolver juntos.", fr: "De petits mystères étranges à résoudre ensemble.", mi: "He mea whakamīharo iti hei whakaaro ngātahi.", zh: "一起思考的奇怪小谜题。", sm: "Ni mea ese mo le mafaufau faatasi." },
    cards: [
      { id: "w1", type: "question", minTier: 0, emoji: "🟢", simple: "Everyone in town turned green! Why do you think that happened?", title: "You wake up, walk outside, and everyone in town is green. Why do you think that happened?", translations: { hi: "आप उठते हैं, बाहर जाते हैं, और शहर में हर कोई हरा है। ऐसा क्यों हुआ होगा?", es: "Te despiertas, sales afuera, y todos en el pueblo son verdes. ¿Por qué crees que pasó eso?", fr: "Tu te réveilles, tu sors, et tout le monde en ville est vert. Pourquoi cela est-il arrivé, selon toi ?", mi: "Ka oho koe, ka haere ki waho, ā, he kākāriki katoa te iwi o te tāone. He aha ō whakaaro i pēnei ai?", zh: "你醒来后走到外面,发现镇上每个人都是绿色的。你觉得为什么会这样?", sm: "E te ala, savali i fafo, ma ua lanu meamata tagata uma i le taulaga. Aisea ua tupu ai lea mea, i lou manatu?" } },
      { id: "w2", type: "question", minTier: 0, emoji: "🐉", title: "You open your school bag and find a tiny dragon inside. What do you do first?", translations: { hi: "आप अपना स्कूल बैग खोलते हैं और अंदर एक छोटा ड्रैगन पाते हैं। आप पहले क्या करेंगे?", es: "Abres tu mochila escolar y encuentras un pequeño dragón adentro. ¿Qué haces primero?", fr: "Tu ouvres ton cartable et tu trouves un petit dragon à l'intérieur. Que fais-tu en premier ?", mi: "Ka huakina e koe tō pēke kura, ā, ka kitea he tarakona iti kei roto. He aha tāu mahi tuatahi?", zh: "你打开书包,发现里面有一只小龙。你会先做什么?", sm: "E te tatalaina lau ato aoga ma maua ai se tamai tarako i totonu. O le a le mea muamua e te faia?" } },
      { id: "w3", type: "question", minTier: 1, emoji: "🌍", title: "One morning, gravity stops working for exactly one minute. What happens in your classroom?", translations: { hi: "एक सुबह, गुरुत्वाकर्षण ठीक एक मिनट के लिए काम करना बंद कर देता है। आपकी कक्षा में क्या होता है?", es: "Una mañana, la gravedad deja de funcionar durante exactamente un minuto. ¿Qué pasa en tu salón de clases?", fr: "Un matin, la gravité s'arrête pendant exactement une minute. Que se passe-t-il dans ta classe ?", mi: "I tētahi ata, ka mutu te mahi a te kukume mō te meneti kotahi tonu. He aha ka pā ki tō akomanga?", zh: "有一天早上,重力刚好停止了一分钟。你的教室里会发生什么事?", sm: "I se tasi taeao, e taofi le malosi o le kalave mo le minute e tasi tonu. O le a tupu i lau potuaoga?" } },
      { id: "w4", type: "question", minTier: 0, emoji: "🐾", simple: "You can understand your pet now! What do they say first?", title: "You can suddenly understand what your pet is saying. What's the first thing they tell you?", translations: { hi: "अचानक आप समझ पाते हैं कि आपका पालतू जानवर क्या कह रहा है। वे आपको सबसे पहले क्या बताते हैं?", es: "De repente puedes entender lo que dice tu mascota. ¿Qué es lo primero que te dice?", fr: "Tu comprends soudain ce que dit ton animal de compagnie. Que te dit-il en premier ?", mi: "Ka mārama ohorere koe ki ngā kōrero a tō kararehe. He aha tāna kōrero tuatahi ki a koe?", zh: "你突然能听懂你的宠物在说什么。它对你说的第一句话是什么?", sm: "E te malamalama faafuasei i mea o loo fai mai ai lau fagafao. O le a le mea muamua e ta'u mai ia te oe?" } },
      { id: "w5", type: "question", minTier: 1, emoji: "⏰", title: "All the clocks in the world stop except yours. What would you do with unlimited time?", translations: { hi: "दुनिया की सभी घड़ियाँ रुक जाती हैं सिवाय आपकी घड़ी के। असीमित समय के साथ आप क्या करेंगे?", es: "Todos los relojes del mundo se detienen excepto el tuyo. ¿Qué harías con tiempo ilimitado?", fr: "Toutes les horloges du monde s'arrêtent sauf la tienne. Que ferais-tu avec un temps illimité ?", mi: "Ka mutu ngā karaka katoa o te ao, engari kāo tāu. He aha tāu mahi mehemea he wā mutunga kore tāu?", zh: "世界上所有的时钟都停了,除了你的。如果你有无限的时间,你会做什么?", sm: "E taofi uma uati i le lalolagi, se'i vagana lau uati. O le a le mea e te faia pe a i ai se taimi e le gata?" } },
      { id: "w6", type: "question", minTier: 0, emoji: "🚪", title: "You find a door in your school that wasn't there yesterday. What's behind it?", translations: { hi: "आपको अपने स्कूल में एक दरवाज़ा मिलता है जो कल नहीं था। उसके पीछे क्या है?", es: "Encuentras una puerta en tu escuela que ayer no estaba. ¿Qué hay detrás?", fr: "Tu trouves une porte dans ton école qui n'était pas là hier. Qu'y a-t-il derrière ?", mi: "Ka kitea e koe he kūaha i tō kura kāore i reira inanahi. He aha kei muri i te kūaha?", zh: "你在学校发现了一扇昨天还没有的门。门后面是什么?", sm: "E te maua se faitotoa i lau aoga e le'i i ai ananafi. O le a i tua o le faitotoa?" } },
      { id: "w7", type: "question", minTier: 0, emoji: "👤", title: "Every shadow in the world starts moving on its own. What do the shadows do?", translations: { hi: "दुनिया की हर परछाई खुद से हिलने लगती है। परछाइयाँ क्या करती हैं?", es: "Todas las sombras del mundo empiezan a moverse solas. ¿Qué hacen las sombras?", fr: "Toutes les ombres du monde se mettent à bouger toutes seules. Que font les ombres ?", mi: "Ka tīmata ngā atarangi katoa o te ao ki te nekeneke anō. He aha ngā mahi a ngā atarangi?", zh: "世界上所有的影子都开始自己移动。这些影子在做什么?", sm: "E amata ona feoa'i le ata o mea uma i le lalolagi na o ia lava. O le a faia e ata?" } },
      { id: "w8", type: "question", minTier: 1, emoji: "❓", title: "You wake up and can only speak in questions for the whole day. How does your day go?", translations: { hi: "आप उठते हैं और पूरे दिन केवल सवालों में बात कर सकते हैं। आपका दिन कैसा गुज़रता है?", es: "Te despiertas y solo puedes hablar en preguntas todo el día. ¿Cómo te va el día?", fr: "Tu te réveilles et tu ne peux parler qu'en posant des questions toute la journée. Comment se passe ta journée ?", mi: "Ka oho koe, ā, ko ngā pātai anake tāu e taea ana te kōrero i te rā katoa. He pēhea tō rā?", zh: "你醒来后发现自己一整天只能用问句说话。你的一天会怎么样?", sm: "E te ala ma e mafai ona e tautala i fesili uma ile aso atoa. O a mea e tutupu i lou aso?" } },
      { id: "w9", type: "question", minTier: 0, emoji: "🌕", simple: "The moon turns into cheese! What happens next?", title: "The moon turns into cheese overnight. What happens to the world the next day?", translations: { hi: "रात भर में चाँद पनीर में बदल जाता है। अगले दिन दुनिया में क्या होता है?", es: "La luna se convierte en queso durante la noche. ¿Qué le pasa al mundo al día siguiente?", fr: "La lune se transforme en fromage pendant la nuit. Que se passe-t-il dans le monde le lendemain ?", mi: "Ka huri te marama hei tīhi i te pō. He aha ka pā ki te ao ā te rā i muri mai?", zh: "月亮在一夜之间变成了奶酪。第二天世界会发生什么事?", sm: "E liua le masina i le suisi i le po. O le a tupu i le lalolagi i le aso na sosoo ai?" } },
      { id: "w10", type: "question", minTier: 0, emoji: "👟", title: "Your shoes let you jump twice as high as normal. What's the first thing you do with this power?", translations: { hi: "आपके जूते आपको सामान्य से दोगुना ऊँचा कूदने देते हैं। इस शक्ति के साथ आप सबसे पहले क्या करेंगे?", es: "Tus zapatos te permiten saltar el doble de alto de lo normal. ¿Qué es lo primero que haces con este poder?", fr: "Tes chaussures te permettent de sauter deux fois plus haut que la normale. Que fais-tu en premier avec ce pouvoir ?", mi: "Ka taea e ō hū te peke kia rua noa ake te teitei i te noa. He aha tāu mahi tuatahi mā tēnei mana?", zh: "你的鞋子能让你跳得比平时高一倍。你会先用这个能力做什么?", sm: "E mafai e ou seevae ona e oso i le maualuga faaluaina. O le a le mea muamua e te faia i lenei mana?" } },
      { id: "w11", type: "question", minTier: 1, emoji: "✏️", title: "You wake up and your left hand can draw perfect copies of anything you look at. What's the first thing you draw?", translations: { hi: "आप उठते हैं और आपका बायाँ हाथ जो भी आप देखते हैं उसकी बिल्कुल सही नकल बना सकता है। आप सबसे पहले क्या बनाएंगे?", es: "Te despiertas y tu mano izquierda puede dibujar copias perfectas de todo lo que mires. ¿Qué es lo primero que dibujas?", fr: "Tu te réveilles et ta main gauche peut dessiner des copies parfaites de tout ce que tu regardes. Que dessines-tu en premier ?", mi: "Ka oho koe, ā, ka taea e tō ringa mauī te tā tino rite o tētahi mea e titiro ana koe. He aha tāu mea tuatahi e tā ai?", zh: "你醒来后发现你的左手能画出你看到的任何东西的完美复制品。你会先画什么?", sm: "E te ala ma e mafai e lou lima agavale ona ata sao mea uma e te va'ai i ai. O le a le mea muamua e te ata ai?" } },
      { id: "w12", type: "question", minTier: 0, emoji: "🔔", title: "Your school bell starts playing a different song every time it rings. What song would you want it to play?", translations: { hi: "आपका स्कूल घंटी हर बार बजने पर एक अलग गाना बजाना शुरू कर देती है। आप चाहेंगे कि वह कौन सा गाना बजाए?", es: "La campana de tu escuela empieza a tocar una canción diferente cada vez que suena. ¿Qué canción te gustaría que tocara?", fr: "La cloche de ton école se met à jouer une chanson différente à chaque fois qu'elle sonne. Quelle chanson aimerais-tu qu'elle joue ?", mi: "Ka tīmata te pere o tō kura ki te whakatangi waiata rerekē i ia wā e tangi ai. He aha te waiata e hiahia ana koe kia whakatangihia?", zh: "你学校的铃声每次响起都会播放不同的歌曲。你希望它播放什么歌?", sm: "Ua amata ona ta'alo se pese eseese le logo o lau aoga i taimi uma e ta ai. O le a le pese e te mana'o e ta'alo?" } },
      { id: "w13", type: "question", minTier: 3, emoji: "🧠", title: "You find out your teacher can read minds, but only on Tuesdays. What would you be careful thinking about?", translations: { hi: "आपको पता चलता है कि आपका शिक्षक मन पढ़ सकता है, लेकिन केवल मंगलवार को। आप किस बारे में सोचने से सावधान रहेंगे?", es: "Descubres que tu profesor puede leer mentes, pero solo los martes. ¿En qué tendrías cuidado de pensar?", fr: "Tu découvres que ton enseignant peut lire dans les pensées, mais seulement le mardi. À quoi ferais-tu attention de penser ?", mi: "Ka kite koe ka taea e tō kaiako te pānui hinengaro, engari ko ngā Rātū anake. He aha tāu e tūpato ai ki te whakaaro?", zh: "你发现你的老师会读心术,但只在星期二。你会小心不去想什么?", sm: "E te iloa e mafai e lau faiaoga ona faitau mafaufauga, ae na o Aso Lua. O le a le mea e te faaeteete ai i ou mafaufauga?" } },
      { id: "w14", type: "question", minTier: 0, emoji: "🤧", title: "Every time you sneeze, a small object appears next to you. What's the strangest thing that's appeared?", translations: { hi: "हर बार जब आप छींकते हैं, आपके बगल में एक छोटी वस्तु प्रकट होती है। अब तक जो सबसे अजीब चीज़ प्रकट हुई है वह क्या है?", es: "Cada vez que estornudas, aparece un pequeño objeto a tu lado. ¿Cuál ha sido lo más raro que ha aparecido?", fr: "Chaque fois que tu éternues, un petit objet apparaît à côté de toi. Quelle est la chose la plus étrange qui soit apparue ?", mi: "I ia wā ka mātihe koe, ka puta mai he mea iti ki tō taha. He aha te mea tino rerekē kua puta mai?", zh: "每次你打喷嚏,都会有一个小物件出现在你身边。出现过的最奇怪的东西是什么?", sm: "I taimi uma e te mafatua ai, e aliali mai ai se mea laititi i ou tafatafa. O le a le mea sili ona ese na aliali mai?" } },
      { id: "w15", type: "question", minTier: 0, emoji: "🎭", title: "You discover a hidden room under the school stage. What's inside?", translations: { hi: "आप स्कूल के मंच के नीचे एक छुपा हुआ कमरा खोजते हैं। उसके अंदर क्या है?", es: "Descubres una habitación escondida debajo del escenario de la escuela. ¿Qué hay dentro?", fr: "Tu découvres une pièce cachée sous la scène de l'école. Qu'y a-t-il à l'intérieur ?", mi: "Ka kitea e koe he rūma huna i raro i te atamira o te kura. He aha kei roto?", zh: "你在学校舞台下发现了一个隐藏的房间。里面有什么?", sm: "E te maua se potu natia i lalo o le fogafale o le aoga. O le a i totonu?" } },
      { id: "w16", type: "question", minTier: 0, emoji: "🐦", simple: "Birds start talking instead of singing! What do they say?", title: "One day, all the birds in your town start talking instead of singing. What are they saying?", translations: { hi: "एक दिन, आपके शहर के सभी पक्षी गाने की बजाय बात करने लगते हैं। वे क्या कह रहे हैं?", es: "Un día, todos los pájaros de tu pueblo empiezan a hablar en lugar de cantar. ¿Qué están diciendo?", fr: "Un jour, tous les oiseaux de ta ville se mettent à parler au lieu de chanter. Que disent-ils ?", mi: "I tētahi rā, ka tīmata ngā manu katoa o tō tāone ki te kōrero, kaua ki te waiata. He aha tā rātou e kī nei?", zh: "有一天,你镇上所有的鸟都开始说话而不是唱歌。它们在说什么?", sm: "I se tasi aso, ua amata ona tautala manulele uma i lou taulaga nai lo le pese. O a mea o loo latou fai mai ai?" } },
      { id: "w17", type: "question", minTier: 3, emoji: "🪞", title: "Your reflection in the mirror starts doing things a few seconds before you do. What would you test first?", translations: { hi: "आपकी परछाई शीशे में आपके करने से कुछ सेकंड पहले चीज़ें करने लगती है। आप सबसे पहले क्या परखेंगे?", es: "Tu reflejo en el espejo empieza a hacer cosas unos segundos antes que tú. ¿Qué probarías primero?", fr: "Ton reflet dans le miroir commence à faire des choses quelques secondes avant toi. Que testerais-tu en premier ?", mi: "Ka tīmata tō whakaahua i te whakaata ki te mahi i ngā mea i mua i a koe e mahi ai, ā, mō ētahi hēkona. He aha tāu e whakamātau tuatahi ai?", zh: "镜子里你的倒影会在你做动作前几秒就先做了。你会先测试什么?", sm: "Ua amata ona muamua faia e lou ata i totonu o le fa'ata ni mea a'o le'i faia e oe, i ni nai sekone. O le a le mea muamua e te su'e?" } },
      { id: "w18", type: "question", minTier: 1, emoji: "🔑", title: "You find a key that opens any lock in the world, but it only works once. What do you unlock?", translations: { hi: "आपको एक चाबी मिलती है जो दुनिया के किसी भी ताले को खोल सकती है, लेकिन यह केवल एक बार काम करती है। आप क्या खोलेंगे?", es: "Encuentras una llave que abre cualquier cerradura del mundo, pero solo funciona una vez. ¿Qué desbloqueas?", fr: "Tu trouves une clé qui ouvre n'importe quelle serrure au monde, mais elle ne fonctionne qu'une seule fois. Qu'est-ce que tu déverrouilles ?", mi: "Ka kitea e koe he kī e whakatuwhera ana i ngā rakiraki katoa o te ao, engari kotahi noa te wā ka mahi. He aha tāu e whakatuwhera?", zh: "你找到一把能打开世界上任何锁的钥匙,但它只能用一次。你会打开什么?", sm: "E te maua se ki e mafai ona tatalaina lokaga uma i le lalolagi, ae na o le tasi taimi e aoga ai. O le a le mea e te tatalaina?" } },
      { id: "w19", type: "question", minTier: 0, emoji: "🔢", simple: "The numbers in maths class come alive! What does number 7 do?", title: "All the numbers in maths class come to life and start walking around. What does number 7 do?", translations: { hi: "गणित की कक्षा में सभी संख्याएँ जीवित हो जाती हैं और चलने लगती हैं। संख्या 7 क्या करती है?", es: "Todos los números en la clase de matemáticas cobran vida y empiezan a caminar. ¿Qué hace el número 7?", fr: "Tous les nombres du cours de maths prennent vie et se mettent à marcher. Que fait le nombre 7 ?", mi: "Ka ora ngā tau katoa i te akomanga pāngarau, ā, ka tīmata ki te hīkoi haere. He aha te mahi a te tau 7?", zh: "数学课上所有的数字都活了过来,开始四处走动。数字7会做什么?", sm: "Ua ola numera uma i le vasega numera ma amata ona savavali. O le a le mea e faia e le numera 7?" } },
      { id: "w20", type: "question", minTier: 0, emoji: "🐧", title: "You wake up speaking fluent penguin. What's the first thing you say to one?", translations: { hi: "आप उठते हैं और धाराप्रवाह पेंगुइन भाषा बोल सकते हैं। आप एक पेंगुइन से सबसे पहले क्या कहेंगे?", es: "Te despiertas hablando pingüino con fluidez. ¿Qué es lo primero que le dices a uno?", fr: "Tu te réveilles en parlant couramment le pingouin. Que dis-tu en premier à l'un d'eux ?", mi: "Ka oho koe, ā, ka mōhio koe ki te kōrero i te reo o te pengiuana. He aha tāu kupu tuatahi ki tētahi?", zh: "你醒来后发现自己能说流利的企鹅语。你会对企鹅说的第一句话是什么?", sm: "E te ala ma e lelei ona tautala i le gagana penguin. O le a le mea muamua e te fai atu i se penguin?" } },
      { id: "w36", type: "question", minTier: 0, emoji: "🧦", simple: "Every sock turns into a puppet! What happens at school?", title: "Overnight, every sock in the world turns into a tiny puppet. What happens at school the next day?", translations: { hi: "रात भर में दुनिया की हर जुराब एक छोटी कठपुतली बन जाती है। अगले दिन स्कूल में क्या होता है?", es: "Durante la noche, todos los calcetines del mundo se convierten en pequeñas marionetas. ¿Qué pasa en la escuela al día siguiente?", fr: "Pendant la nuit, toutes les chaussettes du monde se transforment en petites marionnettes. Que se passe-t-il à l'école le lendemain ?", mi: "I te pō, ka huri ngā tōkena katoa o te ao hei karetao iti. He aha ka pā ki te kura ā te rā i muri mai?", zh: "一夜之间,世界上所有的袜子都变成了小木偶。第二天学校里会发生什么?", sm: "I le po, ua suia ofuvae uma o le lalolagi i pupeta la'ititi. O le a le mea e tupu i le a'oga i le aso na sosoo ai?" } },
      { id: "w37", type: "question", minTier: 0, emoji: "🌧️", simple: "It rains upwards from the ground! What do you do?", title: "It starts raining upwards, from the ground to the sky. What do you do?", translations: { hi: "बारिश उल्टी होने लगती है, ज़मीन से आसमान की ओर। आप क्या करते हैं?", es: "Empieza a llover hacia arriba, del suelo al cielo. ¿Qué haces?", fr: "Il se met à pleuvoir vers le haut, du sol vers le ciel. Que fais-tu ?", mi: "Ka tīmata te ua ki te ara whakarunga, mai i te whenua ki te rangi. He aha tāu mahi?", zh: "雨开始向上下,从地面落向天空。你会怎么做?", sm: "Ua amata ona timu i luga, mai le eleele i le lagi. O le a lau faia?" } },
      { id: "w38", type: "question", minTier: 0, emoji: "🥝", simple: "A kiwi is reading in the school library! What is it reading?", title: "You find a kiwi bird in the school library reading a book. What is it reading?", translations: { hi: "आपको स्कूल की लाइब्रेरी में एक कीवी पक्षी किताब पढ़ता मिलता है। वह क्या पढ़ रहा है?", es: "Encuentras un kiwi en la biblioteca de la escuela leyendo un libro. ¿Qué está leyendo?", fr: "Tu trouves un kiwi dans la bibliothèque de l'école en train de lire un livre. Que lit-il ?", mi: "Ka kitea e koe he kiwi i te whare pukapuka o te kura e pānui pukapuka ana. He aha tāna e pānui nei?", zh: "你在学校图书馆发现一只几维鸟正在看书。它在看什么?", sm: "E te maua se kiwi i le faletusi o le a'oga o faitau se tusi. O le a le mea o loo faitau ai?" } },
      { id: "w39", type: "question", minTier: 1, emoji: "🎒", title: "Your school bag becomes bottomless. What's the strangest thing you pull out?", translations: { hi: "आपका स्कूल बैग अथाह हो जाता है। आप उसमें से सबसे अजीब चीज़ क्या निकालते हैं?", es: "Tu mochila escolar se vuelve sin fondo. ¿Qué es lo más extraño que sacas de ella?", fr: "Ton cartable devient sans fond. Quelle est la chose la plus étrange que tu en sors ?", mi: "Ka kore he take o tō pēke kura. He aha te mea rerekē rawa ka tangohia mai e koe?", zh: "你的书包变得深不见底。你从里面拿出的最奇怪的东西是什么?", sm: "Ua leai se pito i lalo o lau taga a'oga. O le a le mea sili ona uiga ese e te aumai ai?" } },
      { id: "w40", type: "question", minTier: 1, emoji: "🕰️", title: "You discover a clock that makes time run backwards for ten seconds. When would you use it?", translations: { hi: "आपको एक ऐसी घड़ी मिलती है जो दस सेकंड के लिए समय को उल्टा चला देती है। आप इसे कब इस्तेमाल करेंगे?", es: "Descubres un reloj que hace que el tiempo retroceda diez segundos. ¿Cuándo lo usarías?", fr: "Tu découvres une horloge qui fait reculer le temps de dix secondes. Quand l'utiliserais-tu ?", mi: "Ka kitea e koe he karaka e hoki whakamuri ai te wā mō te tekau hēkona. Ahea koe whakamahi ai?", zh: "你发现一个能让时间倒流十秒的钟。你会在什么时候用它?", sm: "E te maua se uati e toe foi tua ai le taimi mo sekone e sefulu. O afea e te faaaogaina ai?" } },
      { id: "w41", type: "question", minTier: 0, emoji: "🪑", simple: "Your chair walks around the room by itself! Where does it take you?", title: "Your classroom chair starts walking around the room by itself. Where does it take you?", translations: { hi: "आपकी कक्षा की कुर्सी अपने आप कमरे में चलने लगती है। वह आपको कहाँ ले जाती है?", es: "Tu silla del salón empieza a caminar sola por el aula. ¿Adónde te lleva?", fr: "Ta chaise de classe se met à marcher toute seule dans la pièce. Où t'emmène-t-elle ?", mi: "Ka tīmata tō tūru akomanga ki te hīkoi i te ruma i a ia anō. Ki hea koe e kawe ai?", zh: "你教室的椅子自己在房间里走了起来。它会带你去哪里?", sm: "Ua amata ona savali lau nofoa i totonu o le potu na o ia. O fea e ave ai oe?" } },
      { id: "w42", type: "question", minTier: 0, emoji: "🍎", simple: "A playground tree grows a different fruit every day! What grows today?", title: "A tree in the playground grows a different fruit every day. What is growing on it today?", translations: { hi: "खेल के मैदान का एक पेड़ हर दिन अलग फल उगाता है। आज उस पर क्या उग रहा है?", es: "Un árbol del patio de recreo da una fruta distinta cada día. ¿Qué está creciendo hoy?", fr: "Un arbre de la cour produit un fruit différent chaque jour. Qu'est-ce qui pousse aujourd'hui ?", mi: "Ka tupu he hua rerekē i tētahi rākau o te papa tākaro ia rā. He aha te mea e tupu ana i āianei?", zh: "操场上的一棵树每天结出不同的果实。今天它结了什么?", sm: "O se la'au i le malae ta'aloga e tupu mai ai se fua eseese i aso uma. O le a le fua o loo tupu i le aso?" } },
      { id: "w43", type: "question", minTier: 1, emoji: "📞", title: "A phone rings in your bag, but you don't own a phone. Who is calling?", translations: { hi: "आपके बैग में फ़ोन बजता है, लेकिन आपके पास फ़ोन है ही नहीं। कौन फ़ोन कर रहा है?", es: "Suena un teléfono en tu mochila, pero tú no tienes teléfono. ¿Quién llama?", fr: "Un téléphone sonne dans ton sac, mais tu n'as pas de téléphone. Qui appelle ?", mi: "Ka tangi he waea i tō pēke, engari kāore koe i te whai waea. Ko wai tērā e waea mai ana?", zh: "你的包里有电话响了,但你根本没有电话。是谁打来的?", sm: "E tatagi se telefoni i lau taga, ae e leai sou telefoni. O wai o loo vala'au mai?" } },
      { id: "w44", type: "question", minTier: 1, emoji: "🌴", title: "The school hall turns into a rainforest for one day. What lessons happen there?", translations: { hi: "स्कूल का हॉल एक दिन के लिए वर्षावन बन जाता है। वहाँ कौन से पाठ होते हैं?", es: "El salón de actos de la escuela se convierte en una selva tropical por un día. ¿Qué clases se dan allí?", fr: "La salle de l'école se transforme en forêt tropicale pour une journée. Quels cours y ont lieu ?", mi: "Ka huri te wharenui o te kura hei ngahere ua mō te kotahi rā. He aha ngā akoranga ka tū ki reira?", zh: "学校礼堂变成了热带雨林,持续一天。那里会上什么课?", sm: "E suia le fale tele o le a'oga i vaomatua timu mo le tasi aso. O a vasega e faia iina?" } },
      { id: "w45", type: "question", minTier: 0, emoji: "🥪", simple: "Your lunch box starts talking! What does it complain about?", title: "Your lunch box starts talking at lunchtime. What does it complain about?", translations: { hi: "दोपहर के खाने के समय आपका लंच बॉक्स बोलने लगता है। वह किस बात की शिकायत करता है?", es: "Tu lonchera empieza a hablar a la hora del almuerzo. ¿De qué se queja?", fr: "Ta boîte à lunch se met à parler à l'heure du déjeuner. De quoi se plaint-elle ?", mi: "Ka tīmata tō pouaka tina ki te kōrero i te wā kai. He aha tāna e amuamu nei?", zh: "午餐时间你的饭盒开始说话了。它在抱怨什么?", sm: "Ua amata ona tautala lau pusa o le taeao i le taimi o le aiga o le aso. O le a le mea o loo ia tagi mai ai?" } },
      { id: "w46", type: "question", minTier: 1, emoji: "🐟", title: "A fish in the school pond starts giving advice. What advice does it give?", translations: { hi: "स्कूल के तालाब की एक मछली सलाह देने लगती है। वह क्या सलाह देती है?", es: "Un pez del estanque de la escuela empieza a dar consejos. ¿Qué consejo da?", fr: "Un poisson du bassin de l'école se met à donner des conseils. Quel conseil donne-t-il ?", mi: "Ka tīmata tētahi ika o te harotoroa o te kura ki te hoatu tohutohu. He aha tāna tohutohu?", zh: "学校池塘里的一条鱼开始给人建议。它给了什么建议?", sm: "Ua amata ona tuuina mai e se i'a i le vaitafe o le a'oga ni fautuaga. O le a le fautuaga e ia tuuina mai?" } },
      { id: "w47", type: "question", minTier: 0, emoji: "🎨", title: "Everything you touch changes colour for one hour. What would you change first?", translations: { hi: "एक घंटे के लिए आप जिस चीज़ को छूते हैं उसका रंग बदल जाता है। आप सबसे पहले क्या बदलेंगे?", es: "Todo lo que tocas cambia de color durante una hora. ¿Qué cambiarías primero?", fr: "Tout ce que tu touches change de couleur pendant une heure. Que changerais-tu en premier ?", mi: "Ka rerekē te tae o ngā mea katoa ka pā koe mō te kotahi hāora. He aha tāu e huri tuatahi?", zh: "一个小时内,你碰到的一切都会变颜色。你会先改变什么?", sm: "Mo le tasi itula, e suia le lanu o mea uma e te pa i ai. O le a le mea e te suia muamua?" } },
      { id: "w48", type: "question", minTier: 2, emoji: "🔊", title: "You can hear what objects are thinking. What is the school clock thinking about?", translations: { hi: "आप सुन सकते हैं कि चीज़ें क्या सोच रही हैं। स्कूल की घड़ी किस बारे में सोच रही है?", es: "Puedes oír lo que piensan los objetos. ¿En qué piensa el reloj de la escuela?", fr: "Tu peux entendre ce que pensent les objets. À quoi pense l'horloge de l'école ?", mi: "Ka rangona e koe ngā whakaaro o ngā mea. He aha te whakaaro o te karaka o te kura?", zh: "你能听到物品在想什么。学校的钟在想什么?", sm: "E mafai ona e faalogo i mea o loo mafaufau i ai mea. O le a le mea o loo mafaufau i ai le uati o le a'oga?" } },
      { id: "w49", type: "question", minTier: 2, emoji: "🌉", title: "A bridge appears in the sky leading somewhere nobody has been. Would you cross it? Why?", translations: { hi: "आसमान में एक पुल दिखाई देता है जो ऐसी जगह जाता है जहाँ कोई नहीं गया। क्या आप उसे पार करेंगे? क्यों?", es: "Aparece un puente en el cielo que lleva a un lugar donde nadie ha estado. ¿Lo cruzarías? ¿Por qué?", fr: "Un pont apparaît dans le ciel et mène à un endroit où personne n'est allé. Le traverserais-tu ? Pourquoi ?", mi: "Ka puta mai he piriti i te rangi e ārahi ana ki tētahi wāhi kāore anō kia tae atu he tangata. Ka whiti koe? He aha ai?", zh: "天空中出现了一座桥,通向没有人去过的地方。你会走过去吗?为什么?", sm: "E aliali mai se alalupe i le lagi e agai i se nofoaga e le'i alu i ai se tasi. E te alu atu ea? Aisea?" } },
      { id: "w50", type: "question", minTier: 2, emoji: "🪞", title: "You walk through a mirror into a world where everything is the opposite. What's different?", translations: { hi: "आप एक आईने से गुज़रकर ऐसी दुनिया में पहुँचते हैं जहाँ सब कुछ उल्टा है। क्या अलग है?", es: "Atraviesas un espejo y llegas a un mundo donde todo es lo contrario. ¿Qué es diferente?", fr: "Tu traverses un miroir et arrives dans un monde où tout est à l'envers. Qu'est-ce qui est différent ?", mi: "Ka haere koe mā tētahi whakaata ki tētahi ao e whakarērekē ana ngā mea katoa. He aha te rerekētanga?", zh: "你穿过一面镜子,来到一个一切都相反的世界。有什么不同?", sm: "E te ui atu i se faata ma o'o atu i se lalolagi e fesuiaiga mea uma. O le a le eseesega?" } },
      { id: "w51", type: "question", minTier: 0, emoji: "📦", simple: "A mystery box with your name on it is at your door! What's inside?", title: "A mysterious box with your name on it appears on your doorstep. What do you hope is inside?", translations: { hi: "आपके दरवाज़े पर आपके नाम का एक रहस्यमयी डिब्बा आता है। आप उम्मीद करते हैं कि उसमें क्या होगा?", es: "Aparece una caja misteriosa con tu nombre en la puerta de tu casa. ¿Qué esperas que haya dentro?", fr: "Une boîte mystérieuse avec ton nom apparaît devant ta porte. Qu'espères-tu y trouver ?", mi: "Ka puta mai he pouaka mīharo me tō ingoa ki tō tatau. He aha tāu e tūmanako ai kei roto?", zh: "一个写着你名字的神秘盒子出现在你家门口。你希望里面是什么?", sm: "E aliali mai se pusa lilo ma lou igoa i lou faitoto. O le a le mea e te faamoemoe o loo i totonu?" } },
      { id: "w52", type: "question", minTier: 1, emoji: "🧩", title: "You get the answer to one question you've always wondered about. What is the question?", translations: { hi: "आपको उस एक सवाल का जवाब मिल जाता है जिसके बारे में आप हमेशा सोचते रहे हैं। वह सवाल क्या है?", es: "Recibes la respuesta a una pregunta que siempre te has hecho. ¿Cuál es la pregunta?", fr: "Tu reçois la réponse à une question que tu t'es toujours posée. Quelle est cette question ?", mi: "Ka whiwhi koe i te whakautu ki tētahi pātai kua roa nei koe e whakaaro ana. He aha te pātai?", zh: "你得到了一直好奇的某个问题的答案。这个问题是什么?", sm: "E maua e oe le tali i se fesili ua leva ona e mafaufau i ai. O le a le fesili?" } },
      { id: "w53", type: "question", minTier: 2, emoji: "🌌", title: "Overnight, the stars rearrange themselves into a message. What does it say?", translations: { hi: "रात भर में तारे ख़ुद को एक संदेश में सजा लेते हैं। उसमें क्या लिखा है?", es: "Durante la noche, las estrellas se reorganizan formando un mensaje. ¿Qué dice?", fr: "Pendant la nuit, les étoiles se réorganisent pour former un message. Que dit-il ?", mi: "I te pō, ka whakarite ngā whetū i a rātou anō hei karere. He aha tāna e kī ana?", zh: "一夜之间,星星重新排列成一条信息。上面写着什么?", sm: "I le po, ua toe faatulaga e fetu se feau. O le a le mea o loo fai mai ai?" } },
      { id: "w54", type: "question", minTier: 0, emoji: "🥄", simple: "Spoons are escaping from kitchens everywhere! Where are they going?", title: "Spoons start escaping from kitchens all around the world. Where are they going?", translations: { hi: "दुनिया भर की रसोइयों से चम्मच भागने लगते हैं। वे कहाँ जा रहे हैं?", es: "Las cucharas empiezan a escapar de las cocinas de todo el mundo. ¿Adónde van?", fr: "Les cuillères se mettent à s'échapper des cuisines du monde entier. Où vont-elles ?", mi: "Ka tīmata ngā kapu tīkākā ki te mawhiti i ngā kīhini puta noa i te ao. Ka haere ki hea rātou?", zh: "世界各地厨房里的勺子开始逃跑。它们要去哪里?", sm: "Ua amata ona sola ipu lauti mai umukuka i le lalolagi atoa. O fea o loo alu i ai?" } },
      { id: "w55", type: "question", minTier: 1, emoji: "🏔️", title: "A mountain appears in the middle of your town overnight. What do people do with it?", translations: { hi: "रात भर में आपके शहर के बीच एक पहाड़ आ जाता है। लोग उसका क्या करते हैं?", es: "Una montaña aparece en medio de tu pueblo durante la noche. ¿Qué hace la gente con ella?", fr: "Une montagne apparaît au milieu de ta ville pendant la nuit. Que font les gens avec elle ?", mi: "I te pō ka puta mai he maunga ki waenganui i tō tāone. He aha tā te iwi mahi ki reira?", zh: "一夜之间,你的镇中心出现了一座山。人们会用它做什么?", sm: "I le po e aliali mai se mauga i le ogatotonu o lou taulaga. O le a le mea e faia e tagata ia te ia?" } },
      { id: "w56", type: "question", minTier: 3, emoji: "📖", title: "You find a diary that writes tomorrow's page today. Would you read it? Why or why not?", translations: { hi: "आपको एक ऐसी डायरी मिलती है जो आज ही कल का पन्ना लिख देती है। क्या आप उसे पढ़ेंगे? क्यों या क्यों नहीं?", es: "Encuentras un diario que escribe hoy la página de mañana. ¿La leerías? ¿Por qué sí o por qué no?", fr: "Tu trouves un journal qui écrit aujourd'hui la page de demain. La lirais-tu ? Pourquoi ou pourquoi pas ?", mi: "Ka kitea e koe he pukapuka rātaka e tuhi ana i te whārangi o apōpō i tēnei rā. Ka pānui koe? He aha ai, he aha rānei te take kāore?", zh: "你发现一本日记,今天就写好了明天的那一页。你会读吗?为什么会或为什么不会?", sm: "E te maua se tusi o aso e tusia i aso nei le itulau o taeao. E te faitau ea? Aisea e te faitau ai po'o le a le mea e te le faitau ai?" } },
      { id: "w57", type: "question", minTier: 0, emoji: "🌼", simple: "Every time you say thank you, a flower grows! What does your day look like?", title: "Every time you say 'thank you', a flower grows nearby. What does your day look like?", translations: { hi: "हर बार जब आप 'धन्यवाद' कहते हैं, पास में एक फूल उग जाता है। आपका दिन कैसा दिखता है?", es: "Cada vez que dices 'gracias', crece una flor cerca. ¿Cómo es tu día?", fr: "Chaque fois que tu dis « merci », une fleur pousse près de toi. À quoi ressemble ta journée ?", mi: "Ia kōrero koe i te 'kia ora', ka tupu he putiputi i tō taha. He pēhea te āhua o tō rā?", zh: "每次你说“谢谢”,身边就会长出一朵花。你的一天会是什么样?", sm: "Pe a e fai atu 'faafetai', e tupu mai se fugalaau i tafatafa. E fa'apefea lou aso?" } },
      { id: "w58", type: "question", minTier: 2, emoji: "🗣️", title: "Overnight, all the world's languages mix into one. How do people cope in the morning?", translations: { hi: "रात भर में दुनिया की सारी भाषाएँ एक में मिल जाती हैं। सुबह लोग कैसे निपटते हैं?", es: "Durante la noche, todos los idiomas del mundo se mezclan en uno. ¿Cómo se las arregla la gente por la mañana?", fr: "Pendant la nuit, toutes les langues du monde se mélangent en une seule. Comment les gens s'en sortent-ils le matin ?", mi: "I te pō, ka whakakotahi ngā reo katoa o te ao. Ka pēhea te iwi i te ata?", zh: "一夜之间,世界上所有的语言混合成了一种。早晨人们怎么应对?", sm: "I le po, ua tuufaatasia gagana uma o le lalolagi i le tasi. E faapefea ona taulimaina e tagata i le taeao?" } },
      { id: "w59", type: "question", minTier: 1, emoji: "🚪", title: "You find a tiny door in a tree. What's behind it, and who lives there?", translations: { hi: "आपको एक पेड़ में एक छोटा दरवाज़ा मिलता है। उसके पीछे क्या है और वहाँ कौन रहता है?", es: "Encuentras una puertecita en un árbol. ¿Qué hay detrás y quién vive allí?", fr: "Tu trouves une minuscule porte dans un arbre. Qu'y a-t-il derrière, et qui y habite ?", mi: "Ka kitea e koe he tatau iti i tētahi rākau. He aha kei muri, ā, ko wai e noho ana ki reira?", zh: "你在一棵树上发现一扇小门。门后有什么?谁住在那里?", sm: "E te maua se faitoto la'ititi i se la'au. O le a le mea o loo i tua, ma o ai o loo nofo i ai?" } },
      { id: "w60", type: "question", minTier: 0, emoji: "🪁", simple: "A kite carries you gently over your town! What do you see?", title: "A kite carries you gently over your town. What do you see?", translations: { hi: "एक पतंग आपको धीरे से आपके शहर के ऊपर ले जाती है। आपको क्या दिखता है?", es: "Una cometa te lleva suavemente sobre tu pueblo. ¿Qué ves?", fr: "Un cerf-volant te porte doucement au-dessus de ta ville. Que vois-tu ?", mi: "Ka kawea koe e tētahi manu tukutuku ki runga i tō tāone. He aha tāu e kite ai?", zh: "一只风筝轻轻地带着你飞过你的小镇。你看到了什么?", sm: "E ave malie oe e se manupiko i luga o lou taulaga. O le a le mea e te vaai i ai?" } },
      { id: "w61", type: "question", minTier: 2, emoji: "🔬", title: "A science experiment shrinks the whole class to the size of ants. What do you explore first?", translations: { hi: "एक विज्ञान प्रयोग पूरी कक्षा को चींटियों जितना छोटा कर देता है। आप सबसे पहले क्या खोजेंगे?", es: "Un experimento de ciencias reduce a toda la clase al tamaño de hormigas. ¿Qué exploras primero?", fr: "Une expérience de sciences réduit toute la classe à la taille de fourmis. Que explores-tu en premier ?", mi: "Ka whakaiti tētahi whakamātau pūtaiao i te akomanga katoa kia rite ki te iti o te popokorua. He aha tāu e torotoro tuatahi?", zh: "一个科学实验把全班同学缩小到蚂蚁那么大。你会先探索什么?", sm: "O se faataitaiga faasaienisi e faaitiitia ai le vasega atoa i le lapopoa o loomatua. O le a le mea e te suʻesuʻe muamua?" } },
      { id: "w62", type: "question", minTier: 1, emoji: "😂", title: "A wave of laughter spreads through the whole school and nobody can stop. What's so funny?", translations: { hi: "हँसी की एक लहर पूरे स्कूल में फैल जाती है और कोई रुक नहीं पाता। इतना मज़ेदार क्या है?", es: "Una ola de risa se extiende por toda la escuela y nadie puede parar. ¿Qué es tan gracioso?", fr: "Une vague de rires se propage dans toute l'école et personne ne peut s'arrêter. Qu'est-ce qui est si drôle ?", mi: "Ka horapa te ngau o te kata puta noa i te kura, ā, kāore tētahi e āhei ki te mutu. He aha te mea rawe?", zh: "一阵笑声传遍整个学校,没有人能停下来。到底有什么这么好笑?", sm: "Ua sosolo se galu o le talatala i le a'oga atoa ma e le mafai e se tasi ona taofi. O le a le mea e malie ai?" } },
      { id: "w63", type: "question", minTier: 3, emoji: "💭", title: "Everyone's dreams are connected for one night. What would you want to see?", translations: { hi: "एक रात के लिए सबके सपने आपस में जुड़ जाते हैं। आप क्या देखना चाहेंगे?", es: "Los sueños de todos se conectan durante una noche. ¿Qué te gustaría ver?", fr: "Les rêves de tout le monde sont reliés le temps d'une nuit. Que voudrais-tu voir ?", mi: "Ka honoa ngā moemoeā o te katoa mō te kotahi pō. He aha tāu e hiahia ai ki te kite?", zh: "一夜之间,每个人的梦都连在一起。你想看到什么?", sm: "Ua fesootai miti o tagata uma mo le tasi po. O le a le mea e te manao e vaai i ai?" } },
      { id: "w64", type: "question", minTier: 3, emoji: "🌙", title: "Imagine a town where nobody ever needs to sleep. What changes, good and bad?", translations: { hi: "एक ऐसे शहर की कल्पना कीजिए जहाँ किसी को कभी सोना नहीं पड़ता। अच्छा और बुरा क्या बदलता है?", es: "Imagina un pueblo donde nadie necesita dormir nunca. ¿Qué cambia, para bien y para mal?", fr: "Imagine une ville où personne n'a jamais besoin de dormir. Qu'est-ce qui change, en bien et en mal ?", mi: "Whakaarohia he tāone kāore he tangata e hiahia ana ki te moe. He aha ngā huringa, te pai me te kino?", zh: "想象一个没有人需要睡觉的小镇。有哪些好的和坏的变化?", sm: "Mafaufau i se taulaga e le manaomia ai e se tasi le moe. O a suiga, lelei ma le leaga?" } },
      { id: "w65", type: "question", minTier: 2, emoji: "✉️", title: "A message in a bottle washes up with your name on it. What does it say?", translations: { hi: "एक बोतल में बंद संदेश आपके नाम के साथ किनारे पर आ लगता है। उसमें क्या लिखा है?", es: "Una botella con un mensaje y tu nombre llega a la orilla. ¿Qué dice el mensaje?", fr: "Une bouteille à la mer arrive sur la plage avec ton nom dessus. Que dit le message ?", mi: "Ka tae mai he pātaka karere ki uta me tō ingoa. He aha tāna e kī ana?", zh: "一个写着你名字的漂流瓶被冲上了岸。里面写了什么?", sm: "Ua tafea mai se fagu ma se feau ma lou igoa i le matafaga. O le a le mea o loo fai mai ai?" } },
      { id: "wa1", type: "activity", minTier: 0, emoji: "🧍", title: "Everyone freeze like a statue for five seconds.", translations: { hi: "सब लोग पाँच सेकंड के लिए मूर्ति की तरह जम जाएँ।", es: "Todos quédense congelados como una estatua durante cinco segundos.", fr: "Tout le monde se fige comme une statue pendant cinq secondes.", mi: "Whakarērea te katoa hei whakapakoko mō ngā hēkona e rima.", zh: "大家像雕像一样静止五秒钟。", sm: "Tagata uma ia le gaoioi e pei o se faatagata mo le lima sekone." } },
      { id: "wa2", type: "activity", minTier: 0, emoji: "🤪", title: "Everyone make the weirdest face you can think of.", translations: { hi: "सब लोग सबसे अजीब चेहरा बनाइए जो आप सोच सकते हैं।", es: "Todos hagan la cara más rara que se les ocurra.", fr: "Tout le monde fait la grimace la plus bizarre possible.", mi: "Waihangatia e te katoa te mata tino rerekē e taea ana e koe te whakaaro.", zh: "大家做出你能想到的最奇怪的表情。", sm: "Tagata uma ia faia le foliga sili ona ese e mafai ona e mafaufau i ai." } },
      { id: "wa3", type: "activity", minTier: 0, emoji: "🦆", title: "Everyone waddle like a duck to the nearest wall and back.", translations: { hi: "सब लोग बत्तख की तरह चलते हुए नज़दीकी दीवार तक जाएँ और वापस आएँ।", es: "Todos caminen como un pato hasta la pared más cercana y regresen.", fr: "Tout le monde marche comme un canard jusqu'au mur le plus proche et revient.", mi: "Hīkoi ai te katoa hei rakiraki ki te pakitara tata rawa ā hoki mai anō.", zh: "大家像鸭子一样摇摇摆摆走到最近的墙边再走回来。", sm: "Tagata uma ia savali e pei o se pato i le puipui lata ane ma toe fo'i mai." } },
      { id: "wa4", type: "activity", minTier: 0, emoji: "🫧", title: "Everyone pretend to blow the biggest bubble gum bubble ever.", translations: { hi: "सब लोग अब तक का सबसे बड़ा बबल गम बुलबुला फुलाने का अभिनय करें।", es: "Todos finjan hacer la burbuja de chicle más grande de la historia.", fr: "Tout le monde fait semblant de souffler la plus grosse bulle de chewing-gum jamais vue.", mi: "Whakaari ai te katoa te whakapupuhi mirumiru pupuha nui rawa atu.", zh: "大家假装吹出有史以来最大的泡泡糖泡泡。", sm: "Tagata uma ia faafoliga e ili le tama'i pulu sili ona tele." } },
      { id: "wa5", type: "activity", minTier: 0, emoji: "🎈", title: "Everyone pretend they are slowly floating away like a balloon.", translations: { hi: "सब लोग ऐसा अभिनय करें जैसे वे धीरे-धीरे गुब्बारे की तरह तैर रहे हैं।", es: "Todos finjan que están flotando lentamente como un globo.", fr: "Tout le monde fait semblant de flotter lentement comme un ballon.", mi: "Whakaari ai te katoa te rewa māhaki pēnei i te poihau.", zh: "大家假装自己像气球一样慢慢飘走。", sm: "Tagata uma ia faafoliga o loo latou opeopea lemu e pei o se pa'u." } },
      { id: "w21", type: "question", minTier: 3, emoji: "🧦", title: "You discover that your left sock always tells the truth and your right sock always lies. How would you use them to find something out?", translations: { hi: "आपको पता चलता है कि आपका बायाँ मोज़ा हमेशा सच बोलता है और दायाँ मोज़ा हमेशा झूठ। आप किसी बात का पता लगाने के लिए उनका उपयोग कैसे करेंगे?", es: "Descubres que tu calcetín izquierdo siempre dice la verdad y el derecho siempre miente. ¿Cómo los usarías para averiguar algo?", fr: "Tu découvres que ta chaussette gauche dit toujours la vérité et ta chaussette droite ment toujours. Comment les utiliserais-tu pour découvrir quelque chose ?", mi: "Ka kite koe he pono tō tokena mauī i ngā wā katoa, he teka tō tokena matau i ngā wā katoa. Me pēhea tō whakamahi i a rāua ki te rapu i tētahi mea?", zh: "你发现你的左袜子总是说真话,右袜子总是说谎话。你会怎么用它们来查明一件事?", sm: "E te iloa e fai mai i taimi uma le mea moni lou totini agavale, ae pepelo i taimi uma lou totini taumatau. E fa'apefea ona e fa'aaogaina i laua e su'e ai se mea?" } },
      { id: "w22", type: "question", minTier: 1, emoji: "📝", title: "One day you realize your homework is doing itself, but only when nobody's watching. What would you try to catch it doing?", translations: { hi: "एक दिन आपको एहसास होता है कि आपका होमवर्क खुद हो रहा है, लेकिन केवल तब जब कोई नहीं देख रहा। आप इसे क्या करते हुए पकड़ने की कोशिश करेंगे?", es: "Un día te das cuenta de que tu tarea se hace sola, pero solo cuando nadie mira. ¿Qué intentarías atraparla haciendo?", fr: "Un jour, tu réalises que tes devoirs se font tout seuls, mais seulement quand personne ne regarde. Que essaierais-tu de la surprendre en train de faire ?", mi: "I tētahi rā ka mōhio koe kei te mahi ake tō mahi kāinga i a ia anō, engari i ngā wā anake kāore he tangata e mātaki ana. He aha tāu e whai ai kia hopukina e mahi ana?", zh: "有一天你发现你的作业会自己完成,但只有在没人看的时候。你想抓到它在做什么?", sm: "I se tasi aso e te iloa o loo faia e lava lau meaaoga, ae na o le taimi e leai ai se tasi o mataʻitu ai. O le a le mea e te taumafai e pu'e ai o loo faia?" } },
      { id: "w23", type: "question", minTier: 1, emoji: "📎", title: "You find out staplers around the world have started disappearing at the exact same time. Where do you think they've gone?", translations: { hi: "आपको पता चलता है कि दुनिया भर में स्टेपलर एक ही समय पर गायब होने लगे हैं। आपको क्या लगता है वे कहाँ चले गए?", es: "Descubres que las grapadoras de todo el mundo han empezado a desaparecer al mismo tiempo. ¿A dónde crees que se han ido?", fr: "Tu découvres que les agrafeuses du monde entier ont commencé à disparaître exactement au même moment. Où penses-tu qu'elles sont parties ?", mi: "Ka kite koe kua ngaro ngā mīhini kōpani pukapuka o te ao katoa i te wā kotahi tonu. Ki tō whakaaro, kua haere rātou ki hea?", zh: "你发现全世界的订书机在同一时间开始消失。你觉得它们去了哪里?", sm: "E te iloa ua amata ona mou uma fa'amau pepa i le lalolagi i le taimi lava e tasi. O fea ua ō i ai, i lou manatu?" } },
      { id: "w24", type: "question", minTier: 2, emoji: "🚪", title: "A giant marshmallow is chasing you through a candy forest! You reach four escape doors. 🔴 Red leads to a slide that drops into total darkness. 🔵 Blue is stuffed with cake so thick you can't see what's behind it. 🟡 Yellow opens into a room full of bouncing jelly that never stops moving. 🟢 Green hums quietly and smells like fresh rain. Which door do you pick, and why?", translations: { hi: "एक विशाल मार्शमैलो कैंडी के जंगल में आपका पीछा कर रहा है! आप चार बचाव दरवाज़ों तक पहुँचते हैं। 🔴 लाल एक ऐसी स्लाइड की ओर ले जाता है जो पूरी तरह अंधेरे में गिरती है। 🔵 नीला केक से इतना भरा है कि आप देख नहीं सकते कि उसके पीछे क्या है। 🟡 पीला एक ऐसे कमरे में खुलता है जो उछलती हुई जेली से भरा है जो कभी रुकती नहीं। 🟢 हरा चुपचाप गुनगुनाता है और ताज़ी बारिश जैसी खुशबू देता है। आप कौन सा दरवाज़ा चुनेंगे, और क्यों?", es: "¡Un malvavisco gigante te persigue por un bosque de caramelos! Llegas a cuatro puertas de escape. 🔴 La roja lleva a un tobogán que cae en la oscuridad total. 🔵 La azul está tan llena de pastel que no puedes ver qué hay detrás. 🟡 La amarilla se abre a una sala llena de gelatina que rebota sin parar. 🟢 La verde tararea suavemente y huele a lluvia fresca. ¿Qué puerta eliges, y por qué?", fr: "Une guimauve géante te poursuit à travers une forêt de bonbons ! Tu arrives à quatre portes de secours. 🔴 La rouge mène à un toboggan qui plonge dans l'obscurité totale. 🔵 La bleue est remplie de gâteau si épais que tu ne peux pas voir ce qu'il y a derrière. 🟡 La jaune s'ouvre sur une pièce pleine de gelée qui rebondit sans arrêt. 🟢 La verte fredonne doucement et sent la pluie fraîche. Quelle porte choisis-tu, et pourquoi ?", mi: "Kei te whai tētahi mātimati nui i a koe puta noa i tētahi ngahere rare! Ka tae koe ki ngā kūaha whakaora e whā. 🔴 Ko te whero e ahu ana ki tētahi rerenga e heke ana ki te pōuri katoa. 🔵 Ko te kikorangi kua kī tonu i te keke, nō reira kāore e kitea he aha kei muri. 🟡 Ko te kōwhai ka tuwhera ki tētahi rūma kua kī i te tia e peke tonu ana, kāore e mutu. 🟢 Ko te kākāriki e ngunguru ana, ā, e rite ana te haunga ki te ua hou. Ko tēhea kūaha tāu e kōwhiri, ā, he aha ai?", zh: "一个巨大的棉花糖正在糖果森林里追你!你来到四扇逃生门前。🔴 红色通向一个滑梯,直接掉入一片漆黑。🔵 蓝色里塞满了蛋糕,厚到你看不见后面是什么。🟡 黄色打开是一个装满不停弹跳的果冻的房间。🟢 绿色安静地嗡嗡作响,闻起来像刚下过的雨。你会选哪扇门,为什么?", sm: "O lo'o tuli oe e se tama'i mariuma tele i totonu o se togavao suamalie! Ua e o'o i faitotoa fa'asao e fa. 🔴 O le mumu e tau atu i se se'eaga e paʻu i le pouliuli atoa. 🔵 O le lanumoana ua tumu i keke ma'ai tele e le mafai ona vaai i tua atu. 🟡 O le samasama e tatala atu i se potu tumu i le sela osooso e le taofia. 🟢 O le lanumeamata e mumumu lemu ma manogi e pei o le timuga fou. O le fea faitotoa e te filifilia, ma aisea?" } },
      { id: "w25", type: "question", minTier: 2, emoji: "🫧", title: "You're trapped in a room that's slowly filling with bubbles! Four buttons could save you. 🔴 Red makes the ceiling open, but it's a long way up. 🔵 Blue floods the room with warm custard instead of bubbles. 🟡 Yellow makes every bubble pop at once with a huge bang. 🟢 Green turns the bubbles into balloons you could ride. Which button do you press, and why?", translations: { hi: "आप एक ऐसे कमरे में फंसे हैं जो धीरे-धीरे बुलबुलों से भर रहा है! चार बटन आपको बचा सकते हैं। 🔴 लाल छत को खोलता है, लेकिन ऊपर जाने में लंबा रास्ता है। 🔵 नीला कमरे को बुलबुलों की बजाय गर्म कस्टर्ड से भर देता है। 🟡 पीला एक साथ ज़ोरदार धमाके के साथ सारे बुलबुले फोड़ देता है। 🟢 हरा बुलबुलों को ऐसे गुब्बारों में बदल देता है जिन पर आप सवारी कर सकें। आप कौन सा बटन दबाएंगे, और क्यों?", es: "¡Estás atrapado en una sala que se está llenando lentamente de burbujas! Cuatro botones podrían salvarte. 🔴 El rojo abre el techo, pero está muy alto. 🔵 El azul inunda la sala con natillas calientes en lugar de burbujas. 🟡 El amarillo hace que todas las burbujas exploten a la vez con un gran estruendo. 🟢 El verde convierte las burbujas en globos que podrías montar. ¿Qué botón presionas, y por qué?", fr: "Tu es piégé dans une pièce qui se remplit lentement de bulles ! Quatre boutons pourraient te sauver. 🔴 Le rouge ouvre le plafond, mais c'est très haut. 🔵 Le bleu inonde la pièce de crème pâtissière chaude au lieu de bulles. 🟡 Le jaune fait éclater toutes les bulles d'un coup avec un grand bruit. 🟢 Le vert transforme les bulles en ballons que tu pourrais chevaucher. Quel bouton appuies-tu, et pourquoi ?", mi: "Kua mau koe ki roto i tētahi rūma e kī haere ana i ngā mirumiru! E whā ngā pātene ka taea te whakaora i a koe. 🔴 Ko te whero ka whakatuwhera i te tuanui, engari he tawhiti ki runga. 🔵 Ko te kikorangi ka waipuke i te rūma ki te kirīmi mahana, kaua ki te mirumiru. 🟡 Ko te kōwhai ka pahū ngā mirumiru katoa i te wā kotahi me te tangi nui. 🟢 Ko te kākāriki ka huri ngā mirumiru hei poihau hei ekenga māu. Ko tēhea pātene tāu e pēhi, ā, he aha ai?", zh: "你被困在一个正慢慢被泡泡填满的房间里!有四个按钮可能救你。🔴 红色按钮能打开天花板,但离得很高。🔵 蓝色按钮会把房间灌满温热的蛋奶糊,而不是泡泡。🟡 黄色按钮会让所有泡泡瞬间“砰”地一声全部破裂。🟢 绿色按钮会把泡泡变成你可以骑的气球。你会按哪个按钮,为什么?", sm: "Ua e mau i totonu o se potu o loo faatumu lemu i pulu! E mafai e pusi e fa ona laveaʻiina oe. 🔴 O le mumu e tatala ai le faaluga, ae mamao i luga. 🔵 O le lanumoana e faatumu ai le potu i le kasata vevela nai lo pulu. 🟡 O le samasama e faapapaina uma ai pulu i le taimi e tasi ma se pa tele. 🟢 O le lanumeamata e liua ai pulu i pa'u e mafai ona e tietie ai. O le fea pusi e te oomi, ma aisea?" } },
      { id: "w26", type: "question", minTier: 1, emoji: "⏪", title: "You find a remote control that can rewind any moment from today, but only once. Which moment would you rewind?", translations: { hi: "आपको एक रिमोट कंट्रोल मिलता है जो आज के किसी भी पल को दोबारा चला सकता है, लेकिन केवल एक बार। आप कौन सा पल दोबारा चलाएंगे?", es: "Encuentras un control remoto que puede rebobinar cualquier momento de hoy, pero solo una vez. ¿Qué momento rebobinarías?", fr: "Tu trouves une télécommande qui peut rembobiner n'importe quel moment d'aujourd'hui, mais une seule fois. Quel moment rembobinerais-tu ?", mi: "Ka kitea e koe he pou whakahaere e taea ai te hoki whakamuri ki tētahi wā o tēnei rā, kotahi noa te wā. Ko tēhea wā tāu e hoki whakamuri ai?", zh: "你找到一个遥控器，可以倒退回今天的任何一个瞬间，但只能用一次。你会倒退回哪个瞬间？", sm: "E te maua se meaʻoso mamao e mafai ona toe faʻafoi i so'o se taimi o le aso nei, ae na o le tasi taimi e aoga ai. O le fea taimi e te toe faʻafoi ai?" } },
      { id: "w27", type: "question", minTier: 0, emoji: "🎆", title: "Every time you laugh, a small firework goes off somewhere in the sky. How many fireworks do you think happened today?", translations: { hi: "हर बार जब आप हंसते हैं, आसमान में कहीं एक छोटी आतिशबाजी होती है। आपको लगता है आज कितनी आतिशबाजी हुई?", es: "Cada vez que te ríes, un pequeño fuego artificial estalla en algún lugar del cielo. ¿Cuántos fuegos artificiales crees que hubo hoy?", fr: "Chaque fois que tu ris, un petit feu d'artifice explose quelque part dans le ciel. Combien de feux d'artifice penses-tu qu'il y a eu aujourd'hui ?", mi: "I ia wā ka kata koe, ka pahū tētahi ahi kōhatu iti i tētahi wāhi o te rangi. Ki tō whakaaro, e hia ngā ahi kōhatu i pahū i tēnei rā?", zh: "每次你笑的时候，天空中某个地方就会放一个小烟花。你觉得今天已经放了多少个烟花？", sm: "I taimi uma e ata ai oe, e pa se tama'i afi mamalu i se mea o le lagi. E fia afi mamalu ua tupu i le aso nei, i lou manatu?" } },
      { id: "w28", type: "question", minTier: 0, emoji: "⭐", title: "You discover your class pet could grant one wish, but only for the whole classroom. What would you wish for?", translations: { hi: "आपको पता चलता है कि आपकी कक्षा का पालतू जानवर एक इच्छा पूरी कर सकता है, लेकिन केवल पूरी कक्षा के लिए। आप क्या मांगेंगे?", es: "Descubres que la mascota de tu clase puede conceder un deseo, pero solo para todo el salón. ¿Qué desearías?", fr: "Tu découvres que l'animal de ta classe peut exaucer un vœu, mais seulement pour toute la classe. Que souhaiterais-tu ?", mi: "Ka kite koe ka taea e te kararehe a tō akomanga te whakatutuki i tētahi hiahia, engari mō te akomanga katoa anake. He aha tāu e hiahia ai?", zh: "你发现班级里的宠物可以实现一个愿望，但只能是给整个班级的。你会许什么愿望？", sm: "E te iloa e mafai e le fagafao a lau vasega ona faataunuu se manaʻoga e tasi, ae na o le vasega atoa. O le a lau manaʻoga?" } },
      { id: "w29", type: "question", minTier: 0, emoji: "🍬", title: "The playground fence turns into liquorice overnight. What do you think happens the next morning?", translations: { hi: "खेल के मैदान की बाड़ रात भर में लिकोरिस में बदल जाती है। आपको लगता है अगली सुबह क्या होता है?", es: "La cerca del patio de juegos se convierte en regaliz durante la noche. ¿Qué crees que pasa a la mañana siguiente?", fr: "La clôture de la cour de récréation se transforme en réglisse pendant la nuit. Que penses-tu qu'il se passe le lendemain matin ?", mi: "Ka huri te taiapa o te papa tākaro hei rare i te pō. Ki tō whakaaro, he aha ka pā i te ata i muri mai?", zh: "操场的围栏一夜之间变成了甘草糖。你觉得第二天早上会发生什么？", sm: "Ua liua le pa o le malae taʻalo i le lole i le po. O le a e manatu e tupu i le taeao na sosoo ai?" } },
      { id: "w30", type: "question", minTier: 0, emoji: "🖨️", title: "You discover your school photocopier can print anything you imagine, not just paper. What's the first thing you'd print?", translations: { hi: "आपको पता चलता है कि आपके स्कूल की फोटोकॉपियर मशीन कुछ भी छाप सकती है जो आप सोचें, सिर्फ कागज़ नहीं। आप सबसे पहले क्या छापेंगे?", es: "Descubres que la fotocopiadora de tu escuela puede imprimir cualquier cosa que imagines, no solo papel. ¿Qué es lo primero que imprimirías?", fr: "Tu découvres que le photocopieur de ton école peut imprimer tout ce que tu imagines, pas seulement du papier. Que imprimerais-tu en premier ?", mi: "Ka kite koe ka taea e te mīhini tārua kura te tā i tētahi mea e whakaarohia ana e koe, kaua ko te pepa anake. He aha tāu mea tuatahi e tā?", zh: "你发现学校的复印机可以打印出你想象的任何东西，不只是纸。你会先打印什么？", sm: "E te iloa e mafai e le masini kopi a lau aoga ona lomia soo se mea e te mafaufau i ai, e le na o pepa. O le a le mea muamua e te lomia?" } },
      { id: "w31", type: "question", minTier: 1, emoji: "🌀", title: "Every Tuesday, your school bag becomes a portal to somewhere new for exactly one minute. Where might it take you today?", translations: { hi: "हर मंगलवार को, आपका स्कूल बैग ठीक एक मिनट के लिए किसी नई जगह का द्वार बन जाता है। आज यह आपको कहां ले जा सकता है?", es: "Cada martes, tu mochila se convierte en un portal a algún lugar nuevo durante exactamente un minuto. ¿A dónde te podría llevar hoy?", fr: "Chaque mardi, ton cartable devient un portail vers un nouvel endroit pendant exactement une minute. Où pourrait-il t'emmener aujourd'hui ?", mi: "Ia Rātū, ka huri tō pēke kura hei kūwaha ki tētahi wāhi hou mō te meneti kotahi tonu. Ki hea pea koe e kawea ai i tēnei rā?", zh: "每个星期二，你的书包都会变成一个通往新地方的传送门，时间刚好一分钟。今天它可能会带你去哪里？", sm: "I Aso Lua uma, e avea ai lau ato aoga ma faitotoa i se mea fou mo le minute e tasi tonu. E ono ave oe i fea i le aso nei?" } },
      { id: "w32", type: "question", minTier: 1, emoji: "🧭", title: "You wake up and gravity only works sideways for an hour. How would you get to school?", translations: { hi: "आप उठते हैं और एक घंटे के लिए गुरुत्वाकर्षण केवल बगल की ओर काम करता है। आप स्कूल कैसे पहुंचेंगे?", es: "Te despiertas y la gravedad solo funciona hacia los lados durante una hora. ¿Cómo llegarías a la escuela?", fr: "Tu te réveilles et la gravité ne fonctionne que sur le côté pendant une heure. Comment irais-tu à l'école ?", mi: "Ka oho koe, ā, kotahi haora ka mahi noa te kukume ki te taha. Me pēhea koe e tae ai ki te kura?", zh: "你醒来后发现重力在一个小时内只朝侧面起作用。你会怎么去上学？", sm: "E te ala ma o loo galue le kalave i le itu mo le itula e tasi. E fa'apefea ona e alu i le aoga?" } },
      { id: "w33", type: "question", minTier: 0, emoji: "☁️", title: "A cloud follows you around all day and only rains when you're happy. What would today look like?", translations: { hi: "एक बादल पूरे दिन आपके साथ रहता है और तभी बारिश करता है जब आप खुश होते हैं। आज का दिन कैसा दिखता?", es: "Una nube te sigue todo el día y solo llueve cuando estás feliz. ¿Cómo se vería el día de hoy?", fr: "Un nuage te suit toute la journée et ne pleut que lorsque tu es content. À quoi ressemblerait aujourd'hui ?", mi: "Ka whai tētahi kapua i a koe i te rā katoa, ā, ka ua noa ina koa ana koe. He pēhea te āhua o tēnei rā?", zh: "一朵云整天跟着你，只有你开心的时候才会下雨。今天会是什么样子？", sm: "E mulimuli mai se ao ia te oe i le aso atoa ma e timu naʻo le taimi e fiafia ai oe. E fa'apefea le aso nei?" } },
      { id: "w34", type: "question", minTier: 0, emoji: "🫙", title: "You find a jar labelled 'Do Not Open Until You're Bored'. You're bored right now. What's inside?", translations: { hi: "आपको एक जार मिलता है जिस पर लिखा है 'जब तक बोर न हों तब तक न खोलें'। आप अभी बोर हैं। अंदर क्या है?", es: "Encuentras un frasco que dice 'No abrir hasta que estés aburrido'. Estás aburrido ahora mismo. ¿Qué hay dentro?", fr: "Tu trouves un bocal étiqueté 'Ne pas ouvrir avant de t'ennuyer'. Tu t'ennuies en ce moment. Qu'y a-t-il à l'intérieur ?", mi: "Ka kitea e koe he ipu kua tuhia 'Kaua e Whakatuwhera Kia Hōhā rā anō koe'. Kei te hōhā koe ināianei. He aha kei roto?", zh: "你发现一个罐子上写着“无聊之前请勿打开”。你现在正好很无聊。里面是什么？", sm: "E te maua se fagu ua faailogaina 'Aua le Tatalaina Seia Fiu oe'. Ua fiu oe i le taimi nei. O le a i totonu?" } },
      { id: "w35", type: "question", minTier: 0, emoji: "🐹", title: "Your class pet starts leaving tiny notes around the room. What does the first note say?", translations: { hi: "आपकी कक्षा का पालतू जानवर कमरे में छोटे-छोटे नोट्स छोड़ना शुरू कर देता है। पहला नोट क्या कहता है?", es: "La mascota de tu clase empieza a dejar pequeñas notas por la sala. ¿Qué dice la primera nota?", fr: "L'animal de ta classe commence à laisser de petits mots dans la pièce. Que dit le premier mot ?", mi: "Ka tīmata te kararehe a tō akomanga ki te waiho i ngā tuhinga iti puta noa i te rūma. He aha te kōrero o te tuhinga tuatahi?", zh: "班级里的宠物开始在教室里留下小纸条。第一张纸条上写了什么？", sm: "Ua amata ona tuu e le fagafao a lau vasega ni tusi laiti i le potu. O le a le upu i le tusi muamua?" } },
    ],
  },
  {
    id: "rather",
    emoji: "🤔",
    title: "Would You Rather",
    description: "Quick-fire choices with no wrong answers.",
    descTranslations: { hi: "तेज़ विकल्प जिनमें कोई गलत जवाब नहीं।", es: "Elecciones rápidas sin respuestas incorrectas.", fr: "Des choix rapides sans mauvaises réponses.", mi: "He kōwhiringa tere kāore he whakautu hē.", zh: "没有错误答案的快速选择题。", sm: "Ni filifiliga vave e leai ni tali sese." },
    cards: [
      { id: "r1", type: "question", minTier: 0, emoji: "🦸", title: "Would you rather be able to fly or be invisible?", translations: { hi: "क्या आप उड़ सकना पसंद करेंगे या अदृश्य होना?", es: "¿Preferirías poder volar o ser invisible?", fr: "Préférerais-tu pouvoir voler ou être invisible ?", mi: "He pai ake ki a koe te rere, te ngaro rānei?", zh: "你想要会飞还是隐身?", sm: "E te mana'o e mafai ona lele pe le vaaia?" } },
      { id: "r2", type: "question", minTier: 0, emoji: "🐘", title: "Would you rather talk to animals or speak every human language?", translations: { hi: "क्या आप जानवरों से बात करना पसंद करेंगे या हर इंसानी भाषा बोलना?", es: "¿Preferirías hablar con animales o hablar todos los idiomas humanos?", fr: "Préférerais-tu parler aux animaux ou parler toutes les langues humaines ?", mi: "He pai ake ki a koe te kōrero ki ngā kararehe, te kōrero rānei i ngā reo tangata katoa?", zh: "你想要能和动物说话,还是会说所有人类语言?", sm: "E te mana'o e talanoa i manu pe tautala i gagana uma a tagata?" } },
      { id: "r3", type: "question", minTier: 0, emoji: "⏱️", title: "Would you rather always be 10 minutes late or always be 20 minutes early?", translations: { hi: "क्या आप हमेशा 10 मिनट देर से पहुँचना पसंद करेंगे या हमेशा 20 मिनट पहले?", es: "¿Preferirías llegar siempre 10 minutos tarde o siempre 20 minutos antes?", fr: "Préférerais-tu toujours arriver 10 minutes en retard ou 20 minutes en avance ?", mi: "He pai ake ki a koe te tōmuri i ngā wā katoa mō ngā meneti 10, te wawe rānei mō ngā meneti 20?", zh: "你想要总是迟到10分钟,还是总是早到20分钟?", sm: "E te mana'o e tuai i taimi uma i le 10 minute pe vave i taimi uma i le 20 minute?" } },
      { id: "r4", type: "question", minTier: 0, emoji: "💪", title: "Would you rather have super strength or super speed?", translations: { hi: "क्या आप सुपर ताकत चाहेंगे या सुपर स्पीड?", es: "¿Preferirías tener superfuerza o supervelocidad?", fr: "Préférerais-tu avoir une force surhumaine ou une vitesse surhumaine ?", mi: "He pai ake ki a koe te kaha nui, te tere nui rānei?", zh: "你想要超级力量还是超级速度?", sm: "E te mana'o i le malosi tele pe le saoasaoa tele?" } },
      { id: "r5", type: "question", minTier: 0, emoji: "🌳", title: "Would you rather live in a treehouse or an underwater house?", translations: { hi: "क्या आप एक ट्री हाउस में रहना पसंद करेंगे या पानी के नीचे वाले घर में?", es: "¿Preferirías vivir en una casa en un árbol o en una casa bajo el agua?", fr: "Préférerais-tu vivre dans une cabane dans les arbres ou dans une maison sous l'eau ?", mi: "He pai ake ki a koe te noho i tētahi whare rākau, i tētahi whare i raro i te wai rānei?", zh: "你想住在树屋里还是水下的房子里?", sm: "E te mana'o e nofo i totonu o se laau maualuga pe se fale i lalo o le vai?" } },
      { id: "r6", type: "question", minTier: 0, emoji: "📱", title: "Would you rather never use a phone again or never watch TV again?", translations: { hi: "क्या आप फिर कभी फोन न इस्तेमाल करना पसंद करेंगे या फिर कभी टीवी न देखना?", es: "¿Preferirías no volver a usar un teléfono o no volver a ver la tele?", fr: "Préférerais-tu ne plus jamais utiliser de téléphone ou ne plus jamais regarder la télé ?", mi: "He pai ake ki a koe kia kore rawa e whakamahi waea anō, kia kore rawa rānei e mātakitaki pouaka whakaata anō?", zh: "你想要再也不用手机,还是再也不看电视?", sm: "E te mana'o e le toe fa'aaogaina se telefoni pe le toe matamata i le TV?" } },
      { id: "r7", type: "question", minTier: 0, emoji: "😂", title: "Would you rather be the funniest person in the room or the smartest?", translations: { hi: "क्या आप कमरे में सबसे मज़ेदार व्यक्ति बनना पसंद करेंगे या सबसे समझदार?", es: "¿Preferirías ser la persona más graciosa de la sala o la más inteligente?", fr: "Préférerais-tu être la personne la plus drôle de la pièce ou la plus intelligente ?", mi: "He pai ake ki a koe te noho hei tangata whakakatakata rawa atu i roto i te rūma, te tangata mōhio rawa atu rānei?", zh: "你想成为房间里最搞笑的人还是最聪明的人?", sm: "E te mana'o e avea oe ma tagata malie tele i le potu pe le atamai tele?" } },
      { id: "r8", type: "question", minTier: 0, emoji: "🚀", title: "Would you rather explore space or explore the deep ocean?", translations: { hi: "क्या आप अंतरिक्ष का अन्वेषण करना पसंद करेंगे या गहरे समुद्र का?", es: "¿Preferirías explorar el espacio o explorar el océano profundo?", fr: "Préférerais-tu explorer l'espace ou explorer les profondeurs de l'océan ?", mi: "He pai ake ki a koe te torotoro i te rangi, te torotoro rānei i te moana hōhonu?", zh: "你想探索太空还是探索深海?", sm: "E te mana'o e su'esu'e le vateatea pe le sami loloto?" } },
      { id: "r9", type: "question", minTier: 0, emoji: "🍦", title: "Would you rather have unlimited ice cream or unlimited holidays?", translations: { hi: "क्या आप असीमित आइसक्रीम चाहेंगे या असीमित छुट्टियाँ?", es: "¿Preferirías tener helado ilimitado o vacaciones ilimitadas?", fr: "Préférerais-tu avoir de la glace illimitée ou des vacances illimitées ?", mi: "He pai ake ki a koe te tio kare mutunga kore, ngā hararei mutunga kore rānei?", zh: "你想要无限的冰淇淋还是无限的假期?", sm: "E te mana'o i le aisa kulimi e le gata pe aso malolo e le gata?" } },
      { id: "r10", type: "question", minTier: 0, emoji: "🎤", title: "Would you rather be a famous singer or a famous scientist?", translations: { hi: "क्या आप एक मशहूर गायक बनना पसंद करेंगे या एक मशहूर वैज्ञानिक?", es: "¿Preferirías ser un cantante famoso o un científico famoso?", fr: "Préférerais-tu être un chanteur célèbre ou un scientifique célèbre ?", mi: "He pai ake ki a koe te noho hei kaiwaiata rongonui, hei kaipūtaiao rongonui rānei?", zh: "你想成为著名歌手还是著名科学家?", sm: "E te mana'o e avea oe ma pu'e pese lauiloa pe saienitisi lauiloa?" } },
      { id: "r11", type: "question", minTier: 0, emoji: "🪽", title: "Would you rather have wings or gills?", translations: { hi: "क्या आप पंख चाहेंगे या गलफड़े?", es: "¿Preferirías tener alas o branquias?", fr: "Préférerais-tu avoir des ailes ou des branchies ?", mi: "He pai ake ki a koe he parirau, he ngau ika rānei?", zh: "你想要翅膀还是鱼鳃?", sm: "E te mana'o i apaau po'o mea manava i lalo o le vai?" } },
      { id: "r12", type: "question", minTier: 1, emoji: "⏸️", title: "Would you rather be able to pause time or rewind time?", translations: { hi: "क्या आप समय को रोक सकना पसंद करेंगे या समय को वापस ले जाना?", es: "¿Preferirías poder pausar el tiempo o rebobinar el tiempo?", fr: "Préférerais-tu pouvoir mettre le temps en pause ou revenir en arrière dans le temps ?", mi: "He pai ake ki a koe te taea te whakatā i te wā, te hoki whakamuri rānei i te wā?", zh: "你想要能暂停时间还是倒退时间?", sm: "E te mana'o e mafai ona fa'amalolo le taimi po'o le toe fo'i i tua i le taimi?" } },
      { id: "r13", type: "question", minTier: 0, emoji: "🎬", title: "Would you rather live without music or without movies?", translations: { hi: "क्या आप संगीत के बिना रहना पसंद करेंगे या फिल्मों के बिना?", es: "¿Preferirías vivir sin música o sin películas?", fr: "Préférerais-tu vivre sans musique ou sans films ?", mi: "He pai ake ki a koe te noho me te kore waiata, me te kore kiriata rānei?", zh: "你想要没有音乐还是没有电影的生活?", sm: "E te mana'o e ola e aunoa ma musika po'o ata tifaga?" } },
      { id: "r14", type: "question", minTier: 3, emoji: "🤥", title: "Would you rather always know when someone is lying or always be able to tell the truth convincingly?", translations: { hi: "क्या आप हमेशा जान पाना पसंद करेंगे कि कब कोई झूठ बोल रहा है, या हमेशा सच को विश्वसनीय तरीके से बता पाना?", es: "¿Preferirías saber siempre cuándo alguien miente o poder decir siempre la verdad de forma convincente?", fr: "Préférerais-tu toujours savoir quand quelqu'un ment ou toujours pouvoir dire la vérité de façon convaincante ?", mi: "He pai ake ki a koe te mōhio i ngā wā katoa mehemea e teka ana tētahi, te taea rānei te kōrero pono i ngā wā katoa me te whakapono?", zh: "你想要总能知道别人在撒谎,还是总能令人信服地说出真相?", sm: "E te mana'o e iloa i taimi uma pe a pepelo se tasi, po'o le mafai ona ta'u atu le mea moni ma le talitonuina?" } },
      { id: "r15", type: "question", minTier: 0, emoji: "🦖", title: "Would you rather have a pet dinosaur or a pet dragon?", translations: { hi: "क्या आप पालतू डायनासोर चाहेंगे या पालतू ड्रैगन?", es: "¿Preferirías tener un dinosaurio de mascota o un dragón de mascota?", fr: "Préférerais-tu avoir un dinosaure de compagnie ou un dragon de compagnie ?", mi: "He pai ake ki a koe he tainahoa hei kararehe, he tarakona hei kararehe rānei?", zh: "你想要养一只宠物恐龙还是宠物龙?", sm: "E te mana'o i se tainoso fagafao po'o se tarako fagafao?" } },
      { id: "r16", type: "question", minTier: 0, emoji: "🎨", title: "Would you rather be really good at maths or really good at art?", translations: { hi: "क्या आप गणित में बहुत अच्छे होना पसंद करेंगे या कला में?", es: "¿Preferirías ser muy bueno en matemáticas o muy bueno en arte?", fr: "Préférerais-tu être très bon en maths ou très bon en art ?", mi: "He pai ake ki a koe te tino pai ki te pāngarau, te tino pai rānei ki te toi?", zh: "你想要非常擅长数学还是非常擅长艺术?", sm: "E te mana'o e sili ona lelei i numera po'o ata?" } },
      { id: "r17", type: "question", minTier: 0, emoji: "😴", title: "Would you rather never feel tired or never feel hungry?", translations: { hi: "क्या आप कभी थकान महसूस न करना पसंद करेंगे या कभी भूख महसूस न करना?", es: "¿Preferirías no sentir nunca cansancio o no sentir nunca hambre?", fr: "Préférerais-tu ne jamais être fatigué ou ne jamais avoir faim ?", mi: "He pai ake ki a koe kia kore rawa e ngenge, kia kore rawa rānei e hiakai?", zh: "你想要永远不觉得累还是永远不觉得饿?", sm: "E te mana'o e le lagona lava le vaivai po'o le fia'ai?" } },
      { id: "r18", type: "question", minTier: 0, emoji: "🌴", title: "Would you rather explore a jungle or explore a cave?", translations: { hi: "क्या आप जंगल का अन्वेषण करना पसंद करेंगे या गुफा का?", es: "¿Preferirías explorar una selva o explorar una cueva?", fr: "Préférerais-tu explorer une jungle ou explorer une grotte ?", mi: "He pai ake ki a koe te torotoro i te ngahere maroke, te torotoro rānei i te ana?", zh: "你想探索丛林还是洞穴?", sm: "E te mana'o e su'esu'e le vaomatua po'o se ana?" } },
      { id: "r19", type: "question", minTier: 1, emoji: "⏪", title: "Would you rather have a rewind button on your day or a fast-forward button?", translations: { hi: "क्या आप अपने दिन पर रिवाइंड बटन चाहेंगे या फास्ट-फॉरवर्ड बटन?", es: "¿Preferirías tener un botón de retroceso en tu día o un botón de avance rápido?", fr: "Préférerais-tu avoir un bouton retour en arrière sur ta journée ou un bouton avance rapide ?", mi: "He pai ake ki a koe he pātene hoki whakamuri mō tō rā, he pātene tere whakamua rānei?", zh: "你想要在你的一天中有一个倒退按钮还是快进按钮?", sm: "E te mana'o i se pusi toe fo'i i tua mo lou aso po'o se pusi vave i luma?" } },
      { id: "r20", type: "question", minTier: 0, emoji: "🌿", title: "Would you rather be able to talk to plants or talk to insects?", translations: { hi: "क्या आप पौधों से बात कर पाना पसंद करेंगे या कीड़ों से?", es: "¿Preferirías poder hablar con las plantas o con los insectos?", fr: "Préférerais-tu pouvoir parler aux plantes ou aux insectes ?", mi: "He pai ake ki a koe te kōrero ki ngā tipu, te kōrero rānei ki ngā ngārara?", zh: "你想要能和植物说话还是和昆虫说话?", sm: "E te mana'o e mafai ona talanoa i la'au po'o iniseti?" } },
      { id: "r36", type: "question", minTier: 0, emoji: "🐘", title: "Would you rather have a tiny elephant as a pet or a giant hamster?", translations: { hi: "क्या आप पालतू के रूप में छोटा हाथी रखना पसंद करेंगे या विशाल हैम्स्टर?", es: "¿Preferirías tener un elefante diminuto como mascota o un hámster gigante?", fr: "Préférerais-tu avoir un minuscule éléphant comme animal de compagnie ou un hamster géant ?", mi: "He pai ake ki a koe he arewhana iti hei mōkai, he hamutā nui rānei?", zh: "你更愿意养一头小象还是一只巨型仓鼠?", sm: "E te sili ona e fiafia i se elefane la'ititi e fai ma fagafao po'o se hamisa tele?" } },
      { id: "r37", type: "question", minTier: 0, emoji: "🌊", title: "Would you rather breathe underwater or jump really high?", translations: { hi: "क्या आप पानी के अंदर साँस लेना पसंद करेंगे या बहुत ऊँचा कूदना?", es: "¿Preferirías respirar bajo el agua o saltar muy alto?", fr: "Préférerais-tu respirer sous l'eau ou sauter très haut ?", mi: "He pai ake ki a koe te manawa i raro i te wai, te peke tiketike rānei?", zh: "你更愿意在水下呼吸还是跳得特别高?", sm: "E te sili ona e manao e manava i lalo o le vai po'o oso i luga?" } },
      { id: "r38", type: "question", minTier: 0, emoji: "🧹", title: "Would you rather never do homework or never tidy your room?", translations: { hi: "क्या आप कभी होमवर्क न करना पसंद करेंगे या कभी अपना कमरा साफ़ न करना?", es: "¿Preferirías no hacer nunca la tarea o no ordenar nunca tu cuarto?", fr: "Préférerais-tu ne jamais faire tes devoirs ou ne jamais ranger ta chambre ?", mi: "He pai ake ki a koe kia kore rawa he mahi kāinga, kia kore rānei e whakapai i tō ruma?", zh: "你更愿意永远不做作业还是永远不整理房间?", sm: "E te sili ona e manao e le faia lava se meaaoga i le fale po'o le le faamaoti lou potu?" } },
      { id: "r39", type: "question", minTier: 0, emoji: "⛵", title: "Would you rather live on a boat or in a caravan?", translations: { hi: "क्या आप नाव पर रहना पसंद करेंगे या कैरावैन में?", es: "¿Preferirías vivir en un barco o en una caravana?", fr: "Préférerais-tu vivre sur un bateau ou dans une caravane ?", mi: "He pai ake ki a koe te noho ki runga poti, ki tētahi whare nekeneke rānei?", zh: "你更愿意住在船上还是住在房车里?", sm: "E te sili ona e nofo i se vaa po'o se fale tafafao?" } },
      { id: "r40", type: "question", minTier: 0, emoji: "🤖", title: "Would you rather have a robot helper or a magic wand?", translations: { hi: "क्या आप रोबोट सहायक पसंद करेंगे या जादुई छड़ी?", es: "¿Preferirías tener un robot ayudante o una varita mágica?", fr: "Préférerais-tu avoir un robot assistant ou une baguette magique ?", mi: "He pai ake ki a koe he karetao āwhina, he tokotoko makutu rānei?", zh: "你更愿意有一个机器人助手还是一根魔法棒?", sm: "E te sili ona e maua se robota fesoasoani po'o se la'au faataulaitu?" } },
      { id: "r41", type: "question", minTier: 0, emoji: "🍕", title: "Would you rather eat only pizza for a week or only fruit for a week?", translations: { hi: "क्या आप एक हफ्ते सिर्फ़ पिज़्ज़ा खाना पसंद करेंगे या सिर्फ़ फल?", es: "¿Preferirías comer solo pizza durante una semana o solo fruta durante una semana?", fr: "Préférerais-tu manger uniquement de la pizza pendant une semaine ou uniquement des fruits ?", mi: "He pai ake ki a koe te kai pītsa anake mō te wiki, he hua rākau anake rānei?", zh: "你更愿意一周只吃披萨还是一周只吃水果?", sm: "E te sili ona e 'ai na o pisa mo le vaiaso po'o fualaau na o ia mo le vaiaso?" } },
      { id: "r42", type: "question", minTier: 1, emoji: "🐬", title: "Would you rather swim with dolphins or climb a volcano?", translations: { hi: "क्या आप डॉल्फ़िन के साथ तैरना पसंद करेंगे या ज्वालामुखी पर चढ़ना?", es: "¿Preferirías nadar con delfines o escalar un volcán?", fr: "Préférerais-tu nager avec des dauphins ou escalader un volcan ?", mi: "He pai ake ki a koe te kauhoe me ngā aihe, te piki ahi puia rānei?", zh: "你更愿意和海豚一起游泳还是爬火山?", sm: "E te sili ona e aau ma le tanifa po'o a'e i se mauga mu?" } },
      { id: "r43", type: "question", minTier: 1, emoji: "🎻", title: "Would you rather play any instrument perfectly or speak five languages?", translations: { hi: "क्या आप कोई भी वाद्य यंत्र पूरी तरह बजाना पसंद करेंगे या पाँच भाषाएँ बोलना?", es: "¿Preferirías tocar perfectamente cualquier instrumento o hablar cinco idiomas?", fr: "Préférerais-tu jouer parfaitement de n'importe quel instrument ou parler cinq langues ?", mi: "He pai ake ki a koe te whakatangi pai i tētahi taonga puoro, te kōrero i ngā reo e rima rānei?", zh: "你更愿意完美演奏任何乐器还是会说五种语言?", sm: "E te sili ona e ta lelei se mea musika po'o tautala i gagana e lima?" } },
      { id: "r44", type: "question", minTier: 0, emoji: "❄️", title: "Would you rather have a snow day or a beach day tomorrow?", translations: { hi: "क्या आप कल बर्फ़ का दिन पसंद करेंगे या समुद्र तट का दिन?", es: "¿Preferirías tener mañana un día de nieve o un día de playa?", fr: "Préférerais-tu une journée de neige ou une journée à la plage demain ?", mi: "He pai ake ki a koe he rā hukarere, he rā tahatai rānei apōpō?", zh: "你更愿意明天是雪天还是海滩日?", sm: "E te sili ona e maua se aso kiona po'o se aso matafaga taeao?" } },
      { id: "r45", type: "question", minTier: 0, emoji: "🐦", title: "Would you rather be a bird for a day or a fish for a day?", translations: { hi: "क्या आप एक दिन के लिए पक्षी बनना पसंद करेंगे या मछली?", es: "¿Preferirías ser un pájaro por un día o un pez por un día?", fr: "Préférerais-tu être un oiseau pour une journée ou un poisson pour une journée ?", mi: "He pai ake ki a koe te noho hei manu mō te rā, hei ika rānei?", zh: "你更愿意当一天的鸟还是当一天的鱼?", sm: "E te sili ona e fai ma manulele mo le aso po'o se i'a mo le aso?" } },
      { id: "r46", type: "question", minTier: 1, emoji: "⏳", title: "Would you rather visit the past or visit the future?", translations: { hi: "क्या आप अतीत में जाना पसंद करेंगे या भविष्य में?", es: "¿Preferirías visitar el pasado o visitar el futuro?", fr: "Préférerais-tu visiter le passé ou visiter le futur ?", mi: "He pai ake ki a koe te toro ki mua, ki muri rānei?", zh: "你更愿意去过去还是去未来?", sm: "E te sili ona e asia le taimi ua tuanai po'o le lumanai?" } },
      { id: "r47", type: "question", minTier: 1, emoji: "📵", title: "Would you rather have a day without screens or a day without sweets?", translations: { hi: "क्या आप एक दिन बिना स्क्रीन के रहना पसंद करेंगे या एक दिन बिना मिठाई के?", es: "¿Preferirías pasar un día sin pantallas o un día sin dulces?", fr: "Préférerais-tu une journée sans écrans ou une journée sans sucreries ?", mi: "He pai ake ki a koe he rā kāore he mata, he rā kāore he kai reka rānei?", zh: "你更愿意一天不用屏幕还是一天不吃甜食?", sm: "E te sili ona e le faaaogaina ni lau mata mo le aso po'o le aai ni mea suamalie?" } },
      { id: "r48", type: "question", minTier: 2, emoji: "🏆", title: "Would you rather be the best player on a losing team or an average player on a winning team?", translations: { hi: "क्या आप हारने वाली टीम के सबसे अच्छे खिलाड़ी बनना पसंद करेंगे या जीतने वाली टीम के औसत खिलाड़ी?", es: "¿Preferirías ser el mejor jugador de un equipo que pierde o un jugador promedio de un equipo que gana?", fr: "Préférerais-tu être le meilleur joueur d'une équipe qui perd ou un joueur moyen d'une équipe qui gagne ?", mi: "He pai ake ki a koe te noho hei kaitākaro pai rawa o tētahi kapa ka hinga, hei kaitākaro toharite o tētahi kapa ka toa rānei?", zh: "你更愿意做输球队伍里最好的球员还是赢球队伍里普通的球员?", sm: "E te sili ona e fai ma tagata taalo sili o se 'au e faatoilalo po'o se tagata taalo masani o se 'au e manumalo?" } },
      { id: "r49", type: "question", minTier: 2, emoji: "🧠", title: "Would you rather always know how everyone feels or always know how everything works?", translations: { hi: "क्या आप हमेशा जानना पसंद करेंगे कि सब कैसा महसूस करते हैं या हमेशा जानना कि सब कुछ कैसे काम करता है?", es: "¿Preferirías saber siempre cómo se siente todo el mundo o saber siempre cómo funciona todo?", fr: "Préférerais-tu toujours savoir ce que ressent chacun ou toujours savoir comment tout fonctionne ?", mi: "He pai ake ki a koe te mōhio i ngā kare ā-roto o te katoa, te mōhio rānei ki te āhua o te mahi a ngā mea katoa?", zh: "你更愿意总是知道每个人的感受还是总是知道万物如何运转?", sm: "E te sili ona e iloa i taimi uma le lagona o tagata uma po'o le faatinoga o mea uma?" } },
      { id: "r50", type: "question", minTier: 2, emoji: "🫂", title: "Would you rather have lots of friends or a few very close friends?", translations: { hi: "क्या आप बहुत सारे दोस्त रखना पसंद करेंगे या कुछ बहुत क़रीबी दोस्त?", es: "¿Preferirías tener muchos amigos o unos pocos amigos muy cercanos?", fr: "Préférerais-tu avoir beaucoup d'amis ou quelques amis très proches ?", mi: "He pai ake ki a koe he tini hoa, he torutoru hoa tata rawa rānei?", zh: "你更愿意有很多朋友还是有几个非常亲密的朋友?", sm: "E te sili ona e tele au uo po'o ni nai uo faapitoa?" } },
      { id: "r51", type: "question", minTier: 1, emoji: "🎁", title: "Would you rather give an amazing gift or receive an amazing gift?", translations: { hi: "क्या आप एक शानदार तोहफ़ा देना पसंद करेंगे या पाना?", es: "¿Preferirías dar un regalo increíble o recibir un regalo increíble?", fr: "Préférerais-tu offrir un cadeau extraordinaire ou en recevoir un ?", mi: "He pai ake ki a koe te hoatu i tētahi koha rawe, te whiwhi rānei i tētahi koha rawe?", zh: "你更愿意送出一份很棒的礼物还是收到一份很棒的礼物?", sm: "E te sili ona e tuuina atu se meaalofa ofoofogia po'o maua se meaalofa ofoofogia?" } },
      { id: "r52", type: "question", minTier: 1, emoji: "🌦️", title: "Would you rather live in a world with no winter or no summer?", translations: { hi: "क्या आप ऐसी दुनिया में रहना पसंद करेंगे जहाँ सर्दी न हो या गर्मी न हो?", es: "¿Preferirías vivir en un mundo sin invierno o sin verano?", fr: "Préférerais-tu vivre dans un monde sans hiver ou sans été ?", mi: "He pai ake ki a koe te noho ki tētahi ao kāore he hōtoke, kāore he raumati rānei?", zh: "你更愿意生活在没有冬天的世界还是没有夏天的世界?", sm: "E te sili ona e nofo i se lalolagi e leai se taumalulu po'o se taumafanafana?" } },
      { id: "r53", type: "question", minTier: 1, emoji: "🪐", title: "Would you rather discover a new planet or a new animal?", translations: { hi: "क्या आप एक नया ग्रह खोजना पसंद करेंगे या एक नया जानवर?", es: "¿Preferirías descubrir un planeta nuevo o un animal nuevo?", fr: "Préférerais-tu découvrir une nouvelle planète ou un nouvel animal ?", mi: "He pai ake ki a koe te kite i tētahi aorangi hou, he kararehe hou rānei?", zh: "你更愿意发现一颗新行星还是一种新动物?", sm: "E te sili ona e maua se paneta fou po'o se manu fou?" } },
      { id: "r54", type: "question", minTier: 3, emoji: "🌏", title: "Would you rather change one big thing about the world or help one person every day?", translations: { hi: "क्या आप दुनिया में एक बड़ी चीज़ बदलना पसंद करेंगे या हर दिन एक व्यक्ति की मदद करना?", es: "¿Preferirías cambiar una cosa grande del mundo o ayudar a una persona cada día?", fr: "Préférerais-tu changer une grande chose dans le monde ou aider une personne chaque jour ?", mi: "He pai ake ki a koe te whakarerekē i tētahi mea nui o te ao, te āwhina rānei i tētahi tangata ia rā?", zh: "你更愿意改变世界上一件大事还是每天帮助一个人?", sm: "E te sili ona e suia se mea tele i le lalolagi po'o fesoasoani i le tasi tagata i aso uma?" } },
      { id: "r55", type: "question", minTier: 3, emoji: "🤐", title: "Would you rather always tell the truth even when it's hard or always keep a secret even when it's hard?", translations: { hi: "क्या आप मुश्किल होने पर भी हमेशा सच बोलना पसंद करेंगे या मुश्किल होने पर भी हमेशा राज़ रखना?", es: "¿Preferirías decir siempre la verdad aunque sea difícil o guardar siempre un secreto aunque sea difícil?", fr: "Préférerais-tu toujours dire la vérité même quand c'est difficile ou toujours garder un secret même quand c'est difficile ?", mi: "He pai ake ki a koe te kōrero pono i ngā wā katoa ahakoa he uaua, te pupuri rānei i tētahi muna ahakoa he uaua?", zh: "你更愿意即使很难也总是说实话,还是即使很难也总是保守秘密?", sm: "E te sili ona e tautala i le upumoni i taimi uma e tusa lava pe faigata po'o le teuina o se mea lilo e tusa lava pe faigata?" } },
      { id: "r56", type: "question", minTier: 2, emoji: "🔁", title: "Would you rather have your best day repeat forever or have every day be a surprise?", translations: { hi: "क्या आप अपना सबसे अच्छा दिन हमेशा दोहराना पसंद करेंगे या हर दिन एक आश्चर्य होना?", es: "¿Preferirías que tu mejor día se repitiera para siempre o que cada día fuera una sorpresa?", fr: "Préférerais-tu que ta meilleure journée se répète pour toujours ou que chaque jour soit une surprise ?", mi: "He pai ake ki a koe kia hoki mai tō rā pai rawa mō ake tonu, kia ohorere rānei ia rā?", zh: "你更愿意最美好的一天永远重复还是每天都是惊喜?", sm: "E te sili ona e toe faia lau aso sili ona lelei e faavavau po'o aso uma o se mea faafuase'i?" } },
      { id: "r57", type: "question", minTier: 0, emoji: "🌳", title: "Would you rather have a treehouse or a trampoline in your backyard?", translations: { hi: "क्या आप अपने आँगन में ट्रीहाउस पसंद करेंगे या ट्रैम्पोलिन?", es: "¿Preferirías tener una casa del árbol o una cama elástica en tu patio?", fr: "Préférerais-tu avoir une cabane dans les arbres ou un trampoline dans ton jardin ?", mi: "He pai ake ki a koe he whare rākau, he tarapirini rānei ki tō papa kāinga?", zh: "你更愿意在后院有一座树屋还是一张蹦床?", sm: "E te sili ona e maua se fale i le la'au po'o se tarampolini i lou lotoa?" } },
      { id: "r58", type: "question", minTier: 0, emoji: "🐜", title: "Would you rather be tiny for a day or giant for a day?", translations: { hi: "क्या आप एक दिन के लिए बहुत छोटा बनना पसंद करेंगे या विशाल?", es: "¿Preferirías ser diminuto por un día o gigante por un día?", fr: "Préférerais-tu être minuscule pour une journée ou géant pour une journée ?", mi: "He pai ake ki a koe te noho iti rawa mō te rā, te noho nui rawa rānei?", zh: "你更愿意当一天的小人还是当一天的巨人?", sm: "E te sili ona e la'ititi mo le aso po'o le tele mo le aso?" } },
      { id: "r59", type: "question", minTier: 1, emoji: "📚", title: "Would you rather have a library with every book or a cinema with every film?", translations: { hi: "क्या आप हर किताब वाली लाइब्रेरी पसंद करेंगे या हर फ़िल्म वाला सिनेमा?", es: "¿Preferirías tener una biblioteca con todos los libros o un cine con todas las películas?", fr: "Préférerais-tu avoir une bibliothèque avec tous les livres ou un cinéma avec tous les films ?", mi: "He pai ake ki a koe he whare pukapuka me ngā pukapuka katoa, he whare kiriata me ngā kiriata katoa rānei?", zh: "你更愿意拥有一座收藏所有书的图书馆还是一家放映所有电影的电影院?", sm: "E te sili ona e maua se faletusi ma tusi uma po'o se fale ata ma ata uma?" } },
      { id: "r60", type: "question", minTier: 0, emoji: "💎", title: "Would you rather find hidden treasure or find a new friend?", translations: { hi: "क्या आप छिपा हुआ ख़ज़ाना खोजना पसंद करेंगे या एक नया दोस्त?", es: "¿Preferirías encontrar un tesoro escondido o hacer un amigo nuevo?", fr: "Préférerais-tu trouver un trésor caché ou te faire un nouvel ami ?", mi: "He pai ake ki a koe te kite i tētahi taonga huna, he hoa hou rānei?", zh: "你更愿意找到隐藏的宝藏还是交到一个新朋友?", sm: "E te sili ona e maua se oa lilo po'o se uo fou?" } },
      { id: "r61", type: "question", minTier: 1, emoji: "🎈", title: "Would you rather plan the class party or lead the class trip?", translations: { hi: "क्या आप कक्षा की पार्टी की योजना बनाना पसंद करेंगे या कक्षा की सैर का नेतृत्व करना?", es: "¿Preferirías planear la fiesta de la clase o dirigir la excursión de la clase?", fr: "Préférerais-tu organiser la fête de la classe ou diriger la sortie de la classe ?", mi: "He pai ake ki a koe te whakarite i te hākari o te akomanga, te hautū rānei i te haerenga o te akomanga?", zh: "你更愿意策划班级派对还是带领班级出游?", sm: "E te sili ona e fuafua le pati a le vasega po'o taitai le malaga a le vasega?" } },
      { id: "r62", type: "question", minTier: 1, emoji: "🔭", title: "Would you rather be an inventor or an explorer?", translations: { hi: "क्या आप आविष्कारक बनना पसंद करेंगे या खोजकर्ता?", es: "¿Preferirías ser inventor o explorador?", fr: "Préférerais-tu être inventeur ou explorateur ?", mi: "He pai ake ki a koe te noho hei kaihanga, hei kaitūhura rānei?", zh: "你更愿意当发明家还是探险家?", sm: "E te sili ona e fai ma tagata faufale po'o se tagata suʻesuʻe?" } },
      { id: "r63", type: "question", minTier: 0, emoji: "🦜", title: "Would you rather learn from a robot teacher or a talking parrot?", translations: { hi: "क्या आप रोबोट शिक्षक से सीखना पसंद करेंगे या बोलने वाले तोते से?", es: "¿Preferirías aprender de un robot maestro o de un loro parlanchín?", fr: "Préférerais-tu apprendre avec un robot professeur ou un perroquet qui parle ?", mi: "He pai ake ki a koe te ako i tētahi kaiako karetao, i tētahi pārera kōrero rānei?", zh: "你更愿意向机器人老师学习还是向会说话的鹦鹉学习?", sm: "E te sili ona e aoao mai i se faiaoga robota po'o se aliimanu e tautala?" } },
      { id: "r64", type: "question", minTier: 0, emoji: "😴", title: "Would you rather have an extra hour of sleep or an extra hour of play every day?", translations: { hi: "क्या आप हर दिन एक घंटा अतिरिक्त नींद पसंद करेंगे या एक घंटा अतिरिक्त खेल?", es: "¿Preferirías tener una hora extra de sueño o una hora extra de juego cada día?", fr: "Préférerais-tu une heure de sommeil en plus ou une heure de jeu en plus chaque jour ?", mi: "He pai ake ki a koe he hāora moe anō, he hāora tākaro anō rānei ia rā?", zh: "你更愿意每天多睡一小时还是多玩一小时?", sm: "E te sili ona e maua se itula faaopoopo o le moe po'o se itula faaopoopo o le taalo i aso uma?" } },
      { id: "r65", type: "question", minTier: 2, emoji: "🌠", title: "Would you rather have one wish for yourself or three wishes for other people?", translations: { hi: "क्या आप अपने लिए एक इच्छा पसंद करेंगे या दूसरों के लिए तीन इच्छाएँ?", es: "¿Preferirías tener un deseo para ti o tres deseos para otras personas?", fr: "Préférerais-tu avoir un vœu pour toi ou trois vœux pour les autres ?", mi: "He pai ake ki a koe he hiahia kotahi mōu, e toru rānei ngā hiahia mō ētahi atu?", zh: "你更愿意为自己许一个愿望还是为别人许三个愿望?", sm: "E te sili ona e maua se manaoga e tasi mo oe po'o manaoga e tolu mo isi tagata?" } },
      { id: "ra1", type: "activity", minTier: 0, emoji: "👍", title: "Everyone give a thumbs up if you'd pick the first choice in the last question, thumbs down if you'd pick the second — no talking!", translations: { hi: "अगर आप पिछले सवाल में पहला विकल्प चुनेंगे तो थम्स अप दिखाएँ, दूसरा चुनेंगे तो थम्स डाउन — बिना बात किए!", es: "Todos den pulgar arriba si elegirían la primera opción de la última pregunta, pulgar abajo si elegirían la segunda — ¡sin hablar!", fr: "Tout le monde lève le pouce si tu choisirais la première option de la dernière question, baisse le pouce pour la seconde — sans parler !", mi: "Whakaaturia e te katoa te matimati whakarunga mehemea ko te kōwhiringa tuatahi tāu mō te pātai o mua, te matimati whakararo mō te tuarua — kaua e kōrero!", zh: "如果你会选择上一个问题的第一个选项就竖起大拇指,选择第二个就把大拇指向下——不许说话!", sm: "Tagata uma ia fa'ailoa le limamatua i luga pe a e filifilia le tali muamua o le fesili talu ai, po'o le limamatua i lalo pe a e filifilia le tali lona lua — aua ne'i tautala!" } },
      { id: "ra2", type: "activity", minTier: 0, emoji: "🦵", title: "Everyone stand on one leg for five seconds.", translations: { hi: "सब लोग पाँच सेकंड के लिए एक पैर पर खड़े हों।", es: "Todos párense en una pierna durante cinco segundos.", fr: "Tout le monde se tient sur une jambe pendant cinq secondes.", mi: "Tū ai te katoa i runga i te waewae kotahi mō ngā hēkona e rima.", zh: "大家单脚站立五秒钟。", sm: "Tagata uma ia tu i luga o le vae e tasi mo le lima sekone." } },
      { id: "ra3", type: "activity", minTier: 0, emoji: "🙋", title: "If you'd pick the first option in the last question, stand up. If the second, stay seated.", translations: { hi: "अगर आप पिछले सवाल में पहला विकल्प चुनेंगे, तो खड़े हो जाएँ। अगर दूसरा, तो बैठे रहें।", es: "Si elegirías la primera opción de la última pregunta, ponte de pie. Si la segunda, quédate sentado.", fr: "Si tu choisirais la première option de la dernière question, lève-toi. Si la seconde, reste assis.", mi: "Mehemea ko te kōwhiringa tuatahi tāu mō te pātai o mua, tū ake. Mehemea ko te tuarua, noho tonu.", zh: "如果你会选择上一个问题的第一个选项,就站起来。如果是第二个,就坐着不动。", sm: "Afai e te filifilia le tali muamua o le fesili talu ai, tu i luga. Afai o le tali lona lua, nofo i lalo." } },
      { id: "ra4", type: "activity", minTier: 0, emoji: "🤐", title: "Everyone act out their answer to the last question without using any words.", translations: { hi: "सब लोग पिछले सवाल का अपना जवाब बिना किसी शब्द का उपयोग किए अभिनय करके दिखाएँ।", es: "Todos actúen su respuesta a la última pregunta sin usar ninguna palabra.", fr: "Tout le monde mime sa réponse à la dernière question sans utiliser de mots.", mi: "Whakaari ai te katoa i tā rātou whakautu mō te pātai o mua me te kore kupu.", zh: "大家用动作表演出自己对上一个问题的答案,不能说话。", sm: "Tagata uma ia fai a latou tali mo le fesili talu ai e aunoa ma se upu." } },
      { id: "ra5", type: "activity", minTier: 0, emoji: "🗳️", title: "Everyone vote with a show of hands for the last question, then count together how many chose each side.", translations: { hi: "सब लोग पिछले सवाल के लिए हाथ उठाकर वोट करें, फिर साथ में गिनें कि कितनों ने कौन सा पक्ष चुना।", es: "Todos voten levantando la mano para la última pregunta, luego cuenten juntos cuántos eligieron cada lado.", fr: "Tout le monde vote à main levée pour la dernière question, puis comptez ensemble combien ont choisi chaque côté.", mi: "Pōti ai te katoa mā te whakaara ringa mō te pātai o mua, kātahi ka tatau ngātahi i te maha o te hunga i kōwhiri i ia taha.", zh: "大家为上一个问题举手投票,然后一起数一数每一方各有多少人选。", sm: "Tagata uma ia palota e ala i le sii o lima mo le fesili talu ai, ona faitau faatasi lea pe fia na filifili i itu taitasi." } },
      { id: "r21", type: "question", minTier: 0, emoji: "🗣️", title: "Would you rather have a voice that only whispers or a voice that always shouts?", translations: { hi: "क्या आप ऐसी आवाज़ चाहेंगे जो केवल फुसफुसाए या ऐसी जो हमेशा चिल्लाए?", es: "¿Preferirías tener una voz que solo susurra o una voz que siempre grita?", fr: "Préférerais-tu avoir une voix qui ne fait que chuchoter ou une voix qui crie toujours ?", mi: "He pai ake ki a koe he reo ngunguru noa, he reo hamama tonu rānei?", zh: "你想要一个只能小声说话的声音,还是一个总是大喊大叫的声音?", sm: "E te mana'o i se leo e musumusu noa po'o se leo e alaga i taimi uma?" } },
      { id: "r22", type: "question", minTier: 3, emoji: "😳", title: "Would you rather be famous for something embarrassing or unknown for something amazing?", translations: { hi: "क्या आप किसी शर्मनाक चीज़ के लिए मशहूर होना पसंद करेंगे या किसी शानदार चीज़ के लिए अनजान रहना?", es: "¿Preferirías ser famoso por algo vergonzoso o desconocido por algo increíble?", fr: "Préférerais-tu être célèbre pour quelque chose d'embarrassant ou inconnu pour quelque chose d'incroyable ?", mi: "He pai ake ki a koe kia rongonui mō tētahi mea whakamā, kia ngaro noa rānei mō tētahi mea whakamīharo?", zh: "你想因为一件尴尬的事而出名,还是因为一件了不起的事而默默无闻?", sm: "E te mana'o e lauiloa oe ona o se mea fa'alumaina po'o le le iloa ona o se mea maoae?" } },
      { id: "r23", type: "question", minTier: 0, emoji: "🕕", title: "Would you rather have your school day start at 6am or finish at 6pm?", translations: { hi: "क्या आप चाहेंगे कि आपका स्कूल का दिन सुबह 6 बजे शुरू हो या शाम 6 बजे खत्म हो?", es: "¿Preferirías que tu día escolar empezara a las 6am o terminara a las 6pm?", fr: "Préférerais-tu que ta journée d'école commence à 6h du matin ou finisse à 18h ?", mi: "He pai ake ki a koe kia tīmata tō rā kura i te 6 karaka o te ata, kia mutu rānei i te 6 karaka o te ahiahi?", zh: "你想让你的上学日在早上6点开始,还是在晚上6点结束?", sm: "E te mana'o e amata lou aso aoga i le 6 o le taeao po'o le fa'ai'u i le 6 o le afiafi?" } },
      { id: "r24", type: "question", minTier: 2, emoji: "🚪", title: "You're being chased by a giant marshmallow through the school hall! Four doors appear. 🔴 Red drops straight down into a dark basement. 🔵 Blue is packed with cake so thick you can't see what's behind it. 🟡 Yellow leads outside, but it's pouring with rain. 🟢 Green plays your favourite song the moment you open it. Which door would you rather choose, and why?", translations: { hi: "एक विशाल मार्शमैलो स्कूल के हॉल में आपका पीछा कर रहा है! चार दरवाज़े दिखाई देते हैं। 🔴 लाल सीधे एक अंधेरे तहखाने में गिराता है। 🔵 नीला केक से इतना भरा है कि आप देख नहीं सकते कि उसके पीछे क्या है। 🟡 पीला बाहर की ओर जाता है, लेकिन बहुत बारिश हो रही है। 🟢 हरा खोलते ही आपका पसंदीदा गाना बजाता है। आप कौन सा दरवाज़ा चुनना पसंद करेंगे, और क्यों?", es: "¡Un malvavisco gigante te persigue por el pasillo de la escuela! Aparecen cuatro puertas. 🔴 La roja cae directo a un sótano oscuro. 🔵 La azul está llena de pastel tan espeso que no puedes ver qué hay detrás. 🟡 La amarilla lleva afuera, pero está lloviendo a cántaros. 🟢 La verde toca tu canción favorita en el momento en que la abres. ¿Qué puerta preferirías elegir, y por qué?", fr: "Une guimauve géante te poursuit dans le couloir de l'école ! Quatre portes apparaissent. 🔴 La rouge tombe directement dans un sous-sol sombre. 🔵 La bleue est remplie de gâteau si épais que tu ne peux pas voir ce qu'il y a derrière. 🟡 La jaune mène dehors, mais il pleut à verse. 🟢 La verte joue ta chanson préférée dès que tu l'ouvres. Quelle porte préférerais-tu choisir, et pourquoi ?", mi: "Kei te whai tētahi mātimati nui i a koe puta noa i te wharenui o te kura! Ka puta ngā kūaha e whā. 🔴 Ko te whero ka heke tika ki raro ki tētahi papa raro pōuri. 🔵 Ko te kikorangi kua kī tonu i te keke, nō reira kāore e kitea he aha kei muri. 🟡 Ko te kōwhai ka anga ki waho, engari e ua nui ana. 🟢 Ko te kākāriki ka whakatangi i tō waiata tino pai i te wā e tuwhera ai koe. Ko tēhea kūaha tāu e pai ake ai ki te kōwhiri, ā, he aha ai?", zh: "一个巨大的棉花糖正在学校走廊里追你!四扇门出现了。🔴 红色直接掉进一个漆黑的地下室。🔵 蓝色塞满了蛋糕,厚到你看不见后面是什么。🟡 黄色通向外面,但外面正下着倾盆大雨。🟢 绿色一打开就播放你最喜欢的歌。你更愿意选哪扇门,为什么?", sm: "O lo'o tuli oe e se tama'i mariuma tele i totonu o le potu maualuga o le aoga! E fa faitotoa e aliali mai. 🔴 O le mumu e paʻu sa'o i lalo i se fale i lalo pouli. 🔵 O le lanumoana ua tumu i keke ma'ai tele e le mafai ona vaai i tua atu. 🟡 O le samasama e tau atu i fafo, ae o loo timu tele. 🟢 O le lanumeamata e ta'alo ai lau pese e sili ona e fiafia i ai i le taimi e tatala ai. O le fea faitotoa e te mana'o e filifilia, ma aisea?" } },
      { id: "r25", type: "question", minTier: 2, emoji: "✨", title: "A wave of glitter is chasing you across the beach! Four paths appear ahead. 🔴 Red leads into a cave with strange echoing noises. 🔵 Blue is a rope bridge that wobbles a lot. 🟡 Yellow is a tunnel completely filled with cushions. 🟢 Green is a path straight up a very tall sand dune. Which would you rather take, and why?", translations: { hi: "चमक की एक लहर समुद्र तट पर आपका पीछा कर रही है! आगे चार रास्ते दिखाई देते हैं। 🔴 लाल एक गुफा की ओर जाता है जिसमें अजीब गूंजने वाली आवाज़ें हैं। 🔵 नीला एक रस्सी वाला पुल है जो बहुत हिलता है। 🟡 पीला एक ऐसी सुरंग है जो पूरी तरह तकियों से भरी है। 🟢 हरा एक बहुत ऊँचे रेत के टीले पर सीधे जाने वाला रास्ता है। आप कौन सा रास्ता लेना पसंद करेंगे, और क्यों?", es: "¡Una ola de purpurina te persigue por la playa! Aparecen cuatro caminos adelante. 🔴 El rojo lleva a una cueva con extraños ruidos que hacen eco. 🔵 El azul es un puente de cuerdas que se tambalea mucho. 🟡 El amarillo es un túnel completamente lleno de cojines. 🟢 El verde es un camino directo hacia una duna de arena muy alta. ¿Cuál preferirías tomar, y por qué?", fr: "Une vague de paillettes te poursuit sur la plage ! Quatre chemins apparaissent devant toi. 🔴 Le rouge mène à une grotte avec d'étranges bruits qui résonnent. 🔵 Le bleu est un pont de corde qui vacille beaucoup. 🟡 Le jaune est un tunnel entièrement rempli de coussins. 🟢 Le vert est un chemin qui monte tout droit sur une très haute dune de sable. Lequel préférerais-tu prendre, et pourquoi ?", mi: "Kei te whai tētahi ngaru kanapa i a koe puta noa i te takutai! Ka puta ngā ara e whā ki mua. 🔴 Ko te whero e ahu ana ki roto i tētahi ana he tangi rerekē te hoki mai. 🔵 Ko te kikorangi he arawhata taura e tino nekeneke ana. 🟡 Ko te kōwhai he ana kua kī tonu i ngā urunga. 🟢 Ko te kākāriki he ara e piki tika ana ki runga i tētahi puke onepū tino teitei. Ko tēhea tāu e pai ake ai ki te haere, ā, he aha ai?", zh: "一股闪光的波浪正在沙滩上追你!前方出现四条路。🔴 红色通向一个山洞,里面有奇怪的回声。🔵 蓝色是一座摇晃得很厉害的绳桥。🟡 黄色是一条完全被垫子填满的隧道。🟢 绿色是一条直接通往一个很高的沙丘的路。你更愿意走哪条,为什么?", sm: "O lo'o tuli oe e se galu pupula i luga o le matafaga! E fa ala e aliali mai i luma. 🔴 O le mumu e tau atu i totonu o se ana e i ai leo ese e taalili mai. 🔵 O le lanumoana o se alalaupapa maea e gaoioi tele. 🟡 O le samasama o se alavai ua tumu i aluga. 🟢 O le lanumeamata o se ala e sa'o i luga o se tuālalo oneone maualuga tele. O le fea e te mana'o e alu ai, ma aisea?" } },
      { id: "r26", type: "question", minTier: 0, emoji: "🐾", title: "Would you rather have a pet that can talk but only complains, or a pet that never talks at all?", translations: { hi: "क्या आप एसा पालतू जानवर चाहेंगे जो बात कर सके लेकिन सिर्फ शिकायत करे, या एसा जो कभी बात न करे?", es: "¿Preferirías tener una mascota que puede hablar pero solo se queja, o una mascota que nunca habla?", fr: "Préférerais-tu avoir un animal qui peut parler mais qui ne fait que se plaindre, ou un animal qui ne parle jamais ?", mi: "He pai ake ki a koe he kararehe e kōrero ana engari he amuamu noa, he kararehe rānei kāore rawa e kōrero?", zh: "你想要一只会说话但只会抱怨的宠物，还是一只完全不会说话的宠物？", sm: "E te mana'o i se fagafao e mafai ona tautala ae naʻo faitio, po'o se fagafao e le tautala lava?" } },
      { id: "r27", type: "question", minTier: 0, emoji: "🎮", title: "Would you rather always win at board games but never video games, or the opposite?", translations: { hi: "क्या आप हमेशा बोर्ड गेम्स में जीतना पसंद करेंगे लेकिन कभी वीडियो गेम्स में नहीं, या इसके उलटा?", es: "¿Preferirías ganar siempre en juegos de mesa pero nunca en videojuegos, o al revés?", fr: "Préférerais-tu toujours gagner aux jeux de société mais jamais aux jeux vidéo, ou l'inverse ?", mi: "He pai ake ki a koe te wini i ngā tākaro papa i ngā wā katoa engari kore rawa i ngā tākaro ataata, tērā rānei te huri?", zh: "你想要总是在桌游中获胜但从不在电子游戏中获胜，还是反过来？", sm: "E te mana'o e manumalo i taimi uma i taʻaloga laupapa ae le manumalo lava i taʻaloga vitiō, po'o le feteenai?" } },
      { id: "r28", type: "question", minTier: 0, emoji: "🎵", title: "Would you rather have your own theme music that plays when you enter a room, or your own spotlight that follows you?", translations: { hi: "क्या आप चाहेंगे कि जब आप कमरे में आएं तो आपका अपना थीम म्यूज़िक बजे, या आपकी अपनी स्पॉटलाइट आपके पीछे चले?", es: "¿Preferirías tener tu propia música de tema que suena cuando entras a una sala, o tu propio foco que te sigue?", fr: "Préférerais-tu avoir ta propre musique thème qui joue quand tu entres dans une pièce, ou ton propre projecteur qui te suit ?", mi: "He pai ake ki a koe he waiata tāpae āu ake e tangi ana ina tomo koe ki tētahi rūma, he rama arotahi āu ake rānei e whai ana i a koe?", zh: "你想要一段专属的主题音乐在你进入房间时播放，还是一束专属的聚光灯跟着你？", sm: "E te mana'o i sau musika totino e taʻalo pe a e ulufale i se potu, po'o sau moli faasino totino e mulimuli mai ia te oe?" } },
      { id: "r29", type: "question", minTier: 0, emoji: "📅", title: "Would you rather skip Mondays forever, or add an extra Saturday every week?", translations: { hi: "क्या आप हमेशा के लिए सोमवार छोड़ना पसंद करेंगे, या हर हफ्ते एक अतिरिक्त शनिवार जोड़ना?", es: "¿Preferirías saltarte los lunes para siempre, o añadir un sábado extra cada semana?", fr: "Préférerais-tu sauter les lundis pour toujours, ou ajouter un samedi supplémentaire chaque semaine ?", mi: "He pai ake ki a koe te kore rawa e whai wāhi ki ngā Mane, te tāpiri rānei i tētahi Hātarei anō ia wiki?", zh: "你想要永远跳过星期一，还是每周多加一个星期六？", sm: "E te mana'o e faaee pea Aso Gafua, po'o le faaopoopo se Aso Toonai fai si tele i vaiaso taʻitasi?" } },
      { id: "r30", type: "question", minTier: 0, emoji: "🧠", title: "Would you rather your teacher could read your mind, or you could read your teacher's mind?", translations: { hi: "क्या आप चाहेंगे कि आपके शिक्षक आपका मन पढ़ सकें, या आप अपने शिक्षक का मन पढ़ सकें?", es: "¿Preferirías que tu profesor pudiera leer tu mente, o que tú pudieras leer la mente de tu profesor?", fr: "Préférerais-tu que ton enseignant puisse lire dans tes pensées, ou que tu puisses lire dans les pensées de ton enseignant ?", mi: "He pai ake ki a koe kia taea e tō kaiako te pānui i tō hinengaro, kia taea rānei e koe te pānui i tō o tō kaiako?", zh: "你想要老师能读懂你的心思，还是你能读懂老师的心思？", sm: "E te mana'o e mafai e lau faiaoga ona faitau lou mafaufau, po'o e mafai e oe ona faitau le mafaufau o lau faiaoga?" } },
      { id: "r31", type: "question", minTier: 0, emoji: "👟", title: "Would you rather have shoes that never get dirty, or a bag that's never too heavy?", translations: { hi: "क्या आप एसे जूते चाहेंगे जो कभी गंदे न हों, या एसा बैग जो कभी भारी न हो?", es: "¿Preferirías tener zapatos que nunca se ensucian, o una mochila que nunca pesa demasiado?", fr: "Préférerais-tu avoir des chaussures qui ne se salissent jamais, ou un sac qui n'est jamais trop lourd ?", mi: "He pai ake ki a koe he hū kāore rawa e paru, he pēke rānei kāore rawa e taumaha rawa?", zh: "你想要一双永远不会弄脏的鞋子，还是一个永远不会太重的书包？", sm: "E te mana'o i seevae e le palapala lava, po'o se ato e le mamafa tele lava?" } },
      { id: "r32", type: "question", minTier: 0, emoji: "🎶", title: "Would you rather learn every school subject through songs, or through games?", translations: { hi: "क्या आप स्कूल का हर विषय गानों के ज़रिए सीखना पसंद करेंगे, या खेलों के ज़रिए?", es: "¿Preferirías aprender todas las asignaturas escolares a través de canciones, o a través de juegos?", fr: "Préférerais-tu apprendre chaque matière scolaire à travers des chansons, ou à travers des jeux ?", mi: "He pai ake ki a koe te ako i ngā kaupapa ako katoa mā ngā waiata, mā ngā tākaro rānei?", zh: "你想要通过歌曲学习所有学校科目，还是通过游戏？", sm: "E te mana'o e aoao mataupu aoga uma e ala i pese, po'o e ala i taʻaloga?" } },
      { id: "r33", type: "question", minTier: 2, emoji: "⏸️", title: "Would you rather be able to pause everyone else but not yourself, or pause yourself but not everyone else?", translations: { hi: "क्या आप बाकी सबको रोक सकना पसंद करेंगे लेकिन खुद को नहीं, या खुद को रोक सकना लेकिन बाकी सबको नहीं?", es: "¿Preferirías poder pausar a todos los demás pero no a ti mismo, o pausarte a ti mismo pero no a los demás?", fr: "Préférerais-tu pouvoir mettre en pause tout le monde sauf toi, ou te mettre en pause toi-même mais pas les autres ?", mi: "He pai ake ki a koe te taea te whakatā i te katoa engari kāore koe, te whakatā rānei i a koe anō engari kāore te katoa?", zh: "你想要能暂停除你以外的所有人，还是能暂停自己但不能暂停别人？", sm: "E te mana'o e mafai ona faamalolo tagata uma nai lo oe lava, po'o le faamalolo oe lava ae le o isi tagata?" } },
      { id: "r34", type: "question", minTier: 0, emoji: "🦁", title: "Would you rather have a growling stomach that sounds like a lion, or a sneeze that sounds like a trumpet?", translations: { hi: "क्या आप एसा पेट चाहेंगे जो शेर जैसी आवाज़ करे, या एसी छींक जो तुरही जैसी बजे?", es: "¿Preferirías tener un estómago que gruñe como un león, o un estornudo que suena como una trompeta?", fr: "Préférerais-tu avoir un ventre qui gronde comme un lion, ou un éternuement qui sonne comme une trompette ?", mi: "He pai ake ki a koe he puku ngunguru e rite ki te raiona, he mātihe rānei e rite ki te pūkane?", zh: "你想要胚子饿的时候发出像狮子吼一样的声音，还是打喷嚇的时候像小号一样响？", sm: "E te mana'o i se manava e tagulu e pei o se leona, po'o se mafatua e leo pei o se pu?" } },
      { id: "r35", type: "question", minTier: 0, emoji: "🔇", title: "Would you rather your school day be silent for an hour, or noisy for an hour?", translations: { hi: "क्या आप चाहेंगे कि आपका स्कूल का दिन एक घंटे के लिए शांत हो, या एक घंटे के लिए शोरगुल वाला?", es: "¿Preferirías que tu día escolar fuera silencioso durante una hora, o ruidoso durante una hora?", fr: "Préférerais-tu que ta journée d'école soit silencieuse pendant une heure, ou bruyante pendant une heure ?", mi: "He pai ake ki a koe kia wahangū tō rā kura mō te haora kotahi, kia turituri rānei mō te haora kotahi?", zh: "你想让你的上学日安静一个小时，还是吵闹一个小时？", sm: "E te mana'o e filemu lou aso aoga mo le itula e tasi, po'o le pisapisao mo le itula e tasi?" } },
    ],
  },
  {
    id: "imagine",
    emoji: "💭",
    title: "Imagine If...",
    description: "Big imaginative what-ifs to explore together.",
    descTranslations: { hi: "साथ में जानने के लिए बड़ी कल्पनाशील 'क्या हो अगर' बातें।", es: "Grandes preguntas imaginativas de 'qué pasaría si' para explorar juntos.", fr: "De grandes questions imaginaires « et si » à explorer ensemble.", mi: "He pātai whakaaro nui mō te 'mehemea' hei torotoro ngātahi.", zh: "一起探索的富有想象力的\u201c如果……会怎样\u201d问题。", sm: "Ni fesili mafaufau tetele e suesue faatasi." },
    cards: [
      { id: "i1", type: "question", minTier: 0, emoji: "🐕", simple: "Imagine animals going to school instead of you! What would their classroom look like?", title: "Imagine if animals could go to school instead of humans. What would their classroom look like?", translations: { hi: "कल्पना करें कि इंसानों की जगह जानवर स्कूल जाते। उनकी कक्षा कैसी दिखती?", es: "Imagina si los animales fueran a la escuela en lugar de los humanos. ¿Cómo sería su salón de clases?", fr: "Imagine si les animaux allaient à l'école à la place des humains. À quoi ressemblerait leur classe ?", mi: "Whakaarohia mehemea ko ngā kararehe kei te haere ki te kura, kaua ko te tangata. He pēhea tō rātou akomanga?", zh: "想象一下,如果是动物而不是人类去上学。他们的教室会是什么样子?", sm: "Mafaufau pe ana o'o manu i le aoga nai lo tagata. E fa'apefea la latou potuaoga?" } },
      { id: "i2", type: "question", minTier: 0, emoji: "🍬", title: "Imagine if it rained lollies instead of water. What would change about the world?", translations: { hi: "कल्पना करें कि पानी की जगह लॉलीज़ की बारिश होती। दुनिया में क्या बदल जाता?", es: "Imagina si en lugar de agua lloviera caramelos. ¿Qué cambiaría en el mundo?", fr: "Imagine s'il pleuvait des bonbons au lieu de l'eau. Qu'est-ce qui changerait dans le monde ?", mi: "Whakaarohia mehemea he rare te ua, kaua he wai. He aha ka huri i te ao?", zh: "想象一下,如果下的是糖果雨而不是水。世界会有什么变化?", sm: "Mafaufau pe ana timu lole nai lo le vai. O le a suia i le lalolagi?" } },
      { id: "i3", type: "question", minTier: 0, emoji: "✨", title: "Imagine if you could teleport anywhere for one day. Where would you go and why?", translations: { hi: "कल्पना करें कि आप एक दिन के लिए कहीं भी टेलीपोर्ट कर सकते। आप कहाँ जाते और क्यों?", es: "Imagina si pudieras teletransportarte a cualquier lugar por un día. ¿A dónde irías y por qué?", fr: "Imagine si tu pouvais te téléporter n'importe où pour une journée. Où irais-tu et pourquoi ?", mi: "Whakaarohia mehemea ka taea e koe te tere ki tētahi wāhi mō te rā kotahi. Ka haere koe ki hea, ā, he aha ai?", zh: "想象一下,如果你可以瞬间移动到任何地方一天。你会去哪里,为什么?", sm: "Mafaufau pe ana mafai ona e feaveai i so'o se mea mo le aso e tasi. E te alu i fea, ma aisea?" } },
      { id: "i4", type: "question", minTier: 0, emoji: "🌲", title: "Imagine if your school was built inside a giant treehouse. What would recess be like?", translations: { hi: "कल्पना करें कि आपका स्कूल एक विशाल ट्री हाउस के अंदर बना होता। रिसेस कैसा होता?", es: "Imagina si tu escuela estuviera construida dentro de una casa del árbol gigante. ¿Cómo sería el recreo?", fr: "Imagine si ton école était construite dans une cabane géante dans les arbres. À quoi ressemblerait la récréation ?", mi: "Whakaarohia mehemea i hangaia tō kura ki roto i tētahi whare rākau nui. He pēhea te wā okioki?", zh: "想象一下,如果你的学校建在一个巨大的树屋里。课间休息会是什么样子?", sm: "Mafaufau pe ana fausia lau aoga i totonu o se laau tele. E fa'apefea le taimi malolo?" } },
      { id: "i5", type: "question", minTier: 1, emoji: "💼", title: "Imagine if everyone in the world had to swap jobs for a day. What job would you want?", translations: { hi: "कल्पना करें कि दुनिया के सभी लोगों को एक दिन के लिए नौकरी बदलनी पड़े। आप कौन सी नौकरी चाहेंगे?", es: "Imagina si todos en el mundo tuvieran que cambiar de trabajo por un día. ¿Qué trabajo querrías?", fr: "Imagine si tout le monde devait échanger son travail pour une journée. Quel travail voudrais-tu ?", mi: "Whakaarohia mehemea me whakawhiti mahi te katoa o te ao mō te rā kotahi. He aha te mahi e hiahia ana koe?", zh: "想象一下,如果世界上每个人都要交换工作一天。你想要什么工作?", sm: "Mafaufau pe ana fesuia'i galuega tagata uma i le lalolagi mo le aso e tasi. O le a le galuega e te mana'o ai?" } },
      { id: "i6", type: "question", minTier: 0, emoji: "📚", simple: "Imagine books could talk! What would your favourite book say?", title: "Imagine if books could talk to you when you opened them. What would your favourite book say?", translations: { hi: "कल्पना करें कि किताबें खोलने पर आपसे बात करतीं। आपकी पसंदीदा किताब क्या कहती?", es: "Imagina si los libros pudieran hablarte cuando los abres. ¿Qué diría tu libro favorito?", fr: "Imagine si les livres pouvaient te parler quand tu les ouvres. Que dirait ton livre préféré ?", mi: "Whakaarohia mehemea ka kōrero mai ngā pukapuka ki a koe ina huakina e koe. He aha te kōrero a tō pukapuka tino pai?", zh: "想象一下,如果书本在你打开时会跟你说话。你最喜欢的书会说什么?", sm: "Mafaufau pe ana mafai e tusi ona talanoa ia te oe pe a e tatalaina. O le a fai mai lau tusi e sili ona e fiafia i ai?" } },
      { id: "i7", type: "question", minTier: 0, emoji: "🆕", title: "Imagine if you could design a new subject for school. What would you call it?", translations: { hi: "कल्पना करें कि आप स्कूल के लिए एक नया विषय डिज़ाइन कर सकते। आप उसे क्या नाम देंगे?", es: "Imagina si pudieras diseñar una nueva asignatura para la escuela. ¿Cómo la llamarías?", fr: "Imagine si tu pouvais créer une nouvelle matière scolaire. Comment l'appellerais-tu ?", mi: "Whakaarohia mehemea ka taea e koe te hanga kaupapa ako hou mō te kura. He aha tō ingoa mōna?", zh: "想象一下,如果你可以为学校设计一门新课程。你会叫它什么名字?", sm: "Mafaufau pe ana mafai ona e fatuina se mataupu fou mo le aoga. O le a lou igoa mo lea mataupu?" } },
      { id: "i8", type: "question", minTier: 0, emoji: "🚗", title: "Imagine if cars could fly. How would your trip to school change?", translations: { hi: "कल्पना करें कि कारें उड़ सकतीं। आपकी स्कूल यात्रा कैसे बदल जाती?", es: "Imagina si los autos pudieran volar. ¿Cómo cambiaría tu viaje a la escuela?", fr: "Imagine si les voitures pouvaient voler. Comment ton trajet vers l'école changerait-il ?", mi: "Whakaarohia mehemea ka taea e ngā waka te rere. He pēhea te huri o tō haerenga ki te kura?", zh: "想象一下,如果汽车会飞。你上学的路程会有什么变化?", sm: "Mafaufau pe ana mafai e ta'avale ona lele. E fa'apefea ona suia lau malaga i le aoga?" } },
      { id: "i9", type: "question", minTier: 1, emoji: "🏫", title: "Imagine if you woke up as the principal for a day. What's the first thing you'd change?", translations: { hi: "कल्पना करें कि आप एक दिन के लिए प्रिंसिपल बनकर उठते। आप सबसे पहले क्या बदलते?", es: "Imagina si te despertaras como director por un día. ¿Qué es lo primero que cambiarías?", fr: "Imagine si tu te réveillais directeur d'école pour une journée. Quelle serait la première chose que tu changerais ?", mi: "Whakaarohia mehemea ka oho koe hei tumuaki mō te rā kotahi. He aha tāu mea tuatahi e huri ai?", zh: "想象一下,如果你有一天醒来发现自己是校长。你会先改变什么?", sm: "Mafaufau pe ana e ala ma avea oe ma puleaoga mo le aso e tasi. O le a le mea muamua e te suia?" } },
      { id: "i10", type: "question", minTier: 0, emoji: "🌱", title: "Imagine if plants could walk around. What would your garden look like?", translations: { hi: "कल्पना करें कि पौधे चल-फिर सकते। आपका बगीचा कैसा दिखता?", es: "Imagina si las plantas pudieran caminar. ¿Cómo se vería tu jardín?", fr: "Imagine si les plantes pouvaient se déplacer. À quoi ressemblerait ton jardin ?", mi: "Whakaarohia mehemea ka taea e ngā tipu te hīkoi haere. He pēhea tō māra?", zh: "想象一下,如果植物可以四处走动。你的花园会是什么样子?", sm: "Mafaufau pe ana mafai e la'au ona savavali. E fa'apefea lou togalaau?" } },
      { id: "i11", type: "question", minTier: 2, emoji: "🫥", title: "Imagine if your shadow had its own personality. What would it be like?", translations: { hi: "कल्पना करें कि आपकी परछाई का अपना व्यक्तित्व होता। वह कैसी होती?", es: "Imagina si tu sombra tuviera su propia personalidad. ¿Cómo sería?", fr: "Imagine si ton ombre avait sa propre personnalité. Comment serait-elle ?", mi: "Whakaarohia mehemea he āhuatanga ake tō tō atarangi. He pēhea tērā?", zh: "想象一下,如果你的影子有自己的个性。它会是什么样子?", sm: "Mafaufau pe ana i ai se uiga totino o lou ata. E fa'apefea?" } },
      { id: "i12", type: "question", minTier: 3, emoji: "🧑‍🏫", title: "Imagine if every student got to run the school for one day. What would change first?", translations: { hi: "कल्पना करें कि हर छात्र को एक दिन के लिए स्कूल चलाने का मौका मिलता। सबसे पहले क्या बदलता?", es: "Imagina si cada estudiante pudiera dirigir la escuela por un día. ¿Qué cambiaría primero?", fr: "Imagine si chaque élève pouvait diriger l'école pour une journée. Qu'est-ce qui changerait en premier ?", mi: "Whakaarohia mehemea ka whakahaere ia ākonga i te kura mō te rā kotahi. He aha te mea tuatahi e huri?", zh: "想象一下,如果每个学生都可以管理学校一天。什么会先改变?", sm: "Mafaufau pe ana faia e tamaiti aoga ta'itasi le pule i le aoga mo le aso e tasi. O le a le mea muamua e suia?" } },
      { id: "i13", type: "question", minTier: 1, emoji: "🎽", title: "Imagine if your uniform changed colour based on your mood. What colour would you be right now?", translations: { hi: "कल्पना करें कि आपकी वर्दी का रंग आपके मूड के अनुसार बदल जाता। अभी आप किस रंग के होते?", es: "Imagina si tu uniforme cambiara de color según tu estado de ánimo. ¿De qué color estarías ahora mismo?", fr: "Imagine si ton uniforme changeait de couleur selon ton humeur. De quelle couleur serais-tu en ce moment ?", mi: "Whakaarohia mehemea ka huri te tae o tō kākahu kura kia rite ki tō āhua ngākau. He aha te tae ināianei?", zh: "想象一下,如果你的校服会根据你的心情变色。你现在会是什么颜色?", sm: "Mafaufau pe ana suia le lanu o lou ofu aoga e fa'atatau i lou lagona. O le a le lanu o oe i le taimi nei?" } },
      { id: "i14", type: "question", minTier: 1, emoji: "🧾", title: "Imagine if homework could be traded like cards. What would you trade yours for?", translations: { hi: "कल्पना करें कि होमवर्क को कार्ड्स की तरह ट्रेड किया जा सकता। आप अपना होमवर्क किसके लिए ट्रेड करेंगे?", es: "Imagina si la tarea se pudiera intercambiar como cartas. ¿Por qué cambiarías la tuya?", fr: "Imagine si les devoirs pouvaient s'échanger comme des cartes. Contre quoi échangerais-tu les tiens ?", mi: "Whakaarohia mehemea ka taea te hokohoko mahi kāinga pēnei i ngā kāri. Ka hokohokona e koe tāu mō te aha?", zh: "想象一下,如果作业可以像卡片一样交换。你会用你的作业换什么?", sm: "Mafaufau pe ana mafai ona fefaiga'i meaaoga e pei o kata. O le a le mea e te fefaiga'i ai lau meaaoga?" } },
      { id: "i15", type: "question", minTier: 0, emoji: "🏫", title: "Imagine if your classroom could float above the ground. Where would you fly it?", translations: { hi: "कल्पना करें कि आपकी कक्षा ज़मीन के ऊपर तैर सकती। आप इसे कहाँ उड़ाएंगे?", es: "Imagina si tu salón de clases pudiera flotar sobre el suelo. ¿A dónde lo llevarías volando?", fr: "Imagine si ta salle de classe pouvait flotter au-dessus du sol. Où l'emmènerais-tu voler ?", mi: "Whakaarohia mehemea ka taea e tō akomanga te rere i runga ake i te whenua. Ka rere koe ki hea?", zh: "想象一下,如果你的教室能悬浮在地面上。你会把它飞到哪里?", sm: "Mafaufau pe ana mafai ona opeopea lau potuaoga i luga a'e o le eleele. E te fa'alele i fea?" } },
      { id: "i16", type: "question", minTier: 3, emoji: "🏳️", title: "Imagine if every country had to swap flags for a week. What flag would you want?", translations: { hi: "कल्पना करें कि हर देश को एक हफ्ते के लिए अपने झंडे बदलने पड़ते। आप कौन सा झंडा चाहेंगे?", es: "Imagina si todos los países tuvieran que intercambiar banderas por una semana. ¿Qué bandera querrías?", fr: "Imagine si chaque pays devait échanger son drapeau pendant une semaine. Quel drapeau voudrais-tu ?", mi: "Whakaarohia mehemea me whakawhiti haki ia whenua mō te wiki kotahi. He aha te haki e hiahia ana koe?", zh: "想象一下,如果每个国家都要交换国旗一周。你想要哪面国旗?", sm: "Mafaufau pe ana fefaiga'i fu'a atunu'u uma mo le vaiaso e tasi. O le a le fu'a e te mana'o ai?" } },
      { id: "i17", type: "question", minTier: 3, emoji: "🎶", title: "Imagine if you could hear people's thoughts as music. What would your best friend sound like?", translations: { hi: "कल्पना करें कि आप लोगों के विचारों को संगीत के रूप में सुन सकते। आपका सबसे अच्छा दोस्त कैसा सुनाई देता?", es: "Imagina si pudieras escuchar los pensamientos de las personas como música. ¿Cómo sonaría tu mejor amigo?", fr: "Imagine si tu pouvais entendre les pensées des gens comme de la musique. À quoi ressemblerait ton meilleur ami ?", mi: "Whakaarohia mehemea ka taea e koe te rongo i ngā whakaaro o te tangata hei waiata. He pēhea te oro o tō hoa piripono?", zh: "想象一下,如果你能把人们的想法听成音乐。你最好的朋友听起来会是什么样子?", sm: "Mafaufau pe ana mafai ona e faalogo i mafaufauga o tagata e pei o se musika. E fa'apefea ona faalogo mai lau uo mamae?" } },
      { id: "i18", type: "question", minTier: 0, emoji: "🌳", simple: "Imagine trees grew books instead of leaves! What book would you want to find?", title: "Imagine if trees grew books instead of leaves. What book would you hope to find?", translations: { hi: "कल्पना करें कि पेड़ों में पत्तों की जगह किताबें उगतीं। आप कौन सी किताब पाना चाहेंगे?", es: "Imagina si los árboles crecieran libros en lugar de hojas. ¿Qué libro esperarías encontrar?", fr: "Imagine si les arbres faisaient pousser des livres au lieu de feuilles. Quel livre espérerais-tu trouver ?", mi: "Whakaarohia mehemea ka tupu he pukapuka i runga i te rākau, kaua he rau. He aha te pukapuka e hiahia ana koe kia kitea?", zh: "想象一下,如果树上长出的是书而不是叶子。你希望找到什么书?", sm: "Mafaufau pe ana tupu tusi i la'au nai lo lau. O le a le tusi e te fa'amoemoe e maua?" } },
      { id: "i19", type: "question", minTier: 0, emoji: "🛝", title: "Imagine if the playground turned into whatever game you were thinking about. What would you build first?", translations: { hi: "कल्पना करें कि खेल का मैदान उस खेल में बदल जाता जिसके बारे में आप सोच रहे थे। आप सबसे पहले क्या बनाएंगे?", es: "Imagina si el patio de juegos se convirtiera en el juego que estuvieras pensando. ¿Qué construirías primero?", fr: "Imagine si la cour de récréation se transformait en n'importe quel jeu auquel tu pensais. Que construirais-tu en premier ?", mi: "Whakaarohia mehemea ka huri te papa tākaro hei tākaro e whakaarohia ana e koe. He aha tāu mea tuatahi e hanga?", zh: "想象一下,如果操场会变成你正在想的任何游戏。你会先建造什么?", sm: "Mafaufau pe ana liua le malae ta'alo i so'o se ta'aloga o loo e mafaufau i ai. O le a le mea muamua e te fausia?" } },
      { id: "i20", type: "question", minTier: 0, emoji: "🚢", simple: "Imagine your school had a submarine, not a bus! Where would it take you?", title: "Imagine if your school had a submarine instead of a bus. Where would it take you?", translations: { hi: "कल्पना करें कि आपके स्कूल में बस की जगह पनडुब्बी होती। यह आपको कहाँ ले जाती?", es: "Imagina si tu escuela tuviera un submarino en lugar de un autobús. ¿A dónde te llevaría?", fr: "Imagine si ton école avait un sous-marin au lieu d'un bus. Où t'emmènerait-il ?", mi: "Whakaarohia mehemea he waka rukiruki tō tō kura, kaua he pahi. Ka kawea koe ki hea?", zh: "想象一下,如果你的学校有一艘潜水艇而不是巴士。它会带你去哪里?", sm: "Mafaufau pe ana i ai se va'a mai lalo o le vai a lau aoga nai lo se pasi. E te ave i fea?" } },
      { id: "i36", type: "question", minTier: 0, emoji: "🛝", simple: "Imagine a giant slide from your school roof to the field! What would you shout on the way down?", title: "Imagine if your school had a giant slide from the roof to the field. What would you shout on the way down?", translations: { hi: "कल्पना कीजिए कि आपके स्कूल की छत से मैदान तक एक विशाल स्लाइड होती। नीचे आते समय आप क्या चिल्लाते?", es: "Imagina que tu escuela tuviera un tobogán gigante desde el techo hasta el campo. ¿Qué gritarías mientras bajas?", fr: "Imagine si ton école avait un toboggan géant du toit jusqu'au terrain. Que crierais-tu en descendant ?", mi: "Whakaarohia he retireti nui mai i te tuanui o tō kura ki te papa tākaro. He aha tāu e karanga ai i a koe e heke ana?", zh: "想象一下你的学校有一个从屋顶通到操场的巨大滑梯。你滑下来时会喊什么?", sm: "Mafaufau pe ana i ai se fa'au tele mai le taualuga o lou a'oga i le malae. O le a le mea e te ave'e ai i lou alu ifo?" } },
      { id: "i37", type: "question", minTier: 0, emoji: "🌈", simple: "Imagine you can slide down a rainbow! Where would you land?", title: "Imagine if you could slide down a rainbow. Where would you land?", translations: { hi: "कल्पना कीजिए कि आप इंद्रधनुष से फिसल सकते हैं। आप कहाँ उतरेंगे?", es: "Imagina que pudieras deslizarte por un arcoíris. ¿Dónde aterrizarías?", fr: "Imagine si tu pouvais glisser le long d'un arc-en-ciel. Où atterrirais-tu ?", mi: "Whakaarohia me i taea e koe te retireti i te āniwaniwa. Ka tau koe ki hea?", zh: "想象一下你可以从彩虹上滑下来。你会落在哪里?", sm: "Mafaufau pe ana e mafai ona e fa'au i se nuanua. O fea e te alu i ai?" } },
      { id: "i38", type: "question", minTier: 0, emoji: "🐘", simple: "Imagine an elephant joins your class! Where would it sit?", title: "Imagine if an elephant joined your class. Where would it sit?", translations: { hi: "कल्पना कीजिए कि एक हाथी आपकी कक्षा में शामिल हो जाता है। वह कहाँ बैठेगा?", es: "Imagina que un elefante se uniera a tu clase. ¿Dónde se sentaría?", fr: "Imagine si un éléphant rejoignait ta classe. Où s'assiérait-il ?", mi: "Whakaarohia he arewhana e uru mai ana ki tō akomanga. Ka noho ia ki hea?", zh: "想象一下一头大象加入了你们班。它会坐在哪里?", sm: "Mafaufau pe ana ma'i se elefane i lou vasega. O fea e nofo ai?" } },
      { id: "i39", type: "question", minTier: 1, emoji: "🌧️", title: "Imagine if it only rained on weekends. How would school days and weekends change?", translations: { hi: "कल्पना कीजिए कि बारिश सिर्फ़ सप्ताहांत में होती। स्कूल के दिन और सप्ताहांत कैसे बदल जाते?", es: "Imagina que solo lloviera los fines de semana. ¿Cómo cambiarían los días de escuela y los fines de semana?", fr: "Imagine s'il ne pleuvait que le week-end. Comment les jours d'école et les week-ends changeraient-ils ?", mi: "Whakaarohia me i ua noa i ngā rā whakataa. Ka pēhea te huri o ngā rā kura me ngā rā whakataa?", zh: "想象一下如果只在周末下雨。上学日和周末会有什么变化?", sm: "Mafaufau pe ana na o le faaiuga o le vaiaso e timu ai. E faapefea ona suia aso a'oga ma faaiuga o vaiaso?" } },
      { id: "i40", type: "question", minTier: 1, emoji: "🪐", title: "Imagine if your school had a space station next door. What experiments would you do?", translations: { hi: "कल्पना कीजिए कि आपके स्कूल के बगल में एक अंतरिक्ष स्टेशन होता। आप कौन से प्रयोग करते?", es: "Imagina que tu escuela tuviera una estación espacial al lado. ¿Qué experimentos harías?", fr: "Imagine si ton école avait une station spatiale juste à côté. Quelles expériences ferais-tu ?", mi: "Whakaarohia he teihana mokowhiti kei te taha o tō kura. He aha ngā whakamātau ka mahia e koe?", zh: "想象一下你的学校隔壁有一个空间站。你会做什么实验?", sm: "Mafaufau pe ana i ai se nofoaga vateatea i tafatafa o lou a'oga. O a faataitaiga e te faia?" } },
      { id: "i41", type: "question", minTier: 0, emoji: "🎤", simple: "Imagine everyone sings instead of talking for a day! What song would you sing to say good morning?", title: "Imagine if everyone sang instead of talking for one day. What song would you sing to say good morning?", translations: { hi: "कल्पना कीजिए कि एक दिन सब बोलने की जगह गाते। 'सुप्रभात' कहने के लिए आप कौन सा गाना गाते?", es: "Imagina que todos cantaran en vez de hablar durante un día. ¿Qué canción cantarías para dar los buenos días?", fr: "Imagine si tout le monde chantait au lieu de parler pendant une journée. Quelle chanson chanterais-tu pour dire bonjour ?", mi: "Whakaarohia me i waiata te katoa kaua ki te kōrero mō te rā. He aha te waiata ka waiatatia e koe hei mihi i te ata?", zh: "想象一下大家一整天都用唱歌代替说话。你会唱什么歌来说早上好?", sm: "Mafaufau pe ana e pese tagata uma nai lo le tautala mo le aso. O le a le pese e te pese ai e fai atu ai manuia le taeao?" } },
      { id: "i42", type: "question", minTier: 0, emoji: "🍰", simple: "Imagine you bake a cake that gives people a special power! What power does it give?", title: "Imagine if you could bake a cake that gives people a special power. What power would it give?", translations: { hi: "कल्पना कीजिए कि आप ऐसा केक बना सकते जो लोगों को ख़ास शक्ति देता। वह कौन सी शक्ति देता?", es: "Imagina que pudieras hornear un pastel que diera un poder especial a la gente. ¿Qué poder daría?", fr: "Imagine si tu pouvais préparer un gâteau qui donne un pouvoir spécial à ceux qui le mangent. Quel pouvoir donnerait-il ?", mi: "Whakaarohia me i taea e koe te tunu keke hei hoatu i tētahi mana motuhake ki te tangata. He aha taua mana?", zh: "想象一下你能烤一个让人拥有特殊能力的蛋糕。它会给人什么能力?", sm: "Mafaufau pe ana e mafai ona e tao se keke e tuuina atu ai se malosi faapitoa i tagata. O le a le malosi?" } },
      { id: "i43", type: "question", minTier: 1, emoji: "🧙", title: "Imagine you meet a wise person in the forest who can answer one question. What would you ask?", translations: { hi: "कल्पना कीजिए कि आप जंगल में एक बुद्धिमान व्यक्ति से मिलते हैं जो एक सवाल का जवाब दे सकता है। आप क्या पूछेंगे?", es: "Imagina que encuentras en el bosque a una persona sabia que puede responder una pregunta. ¿Qué preguntarías?", fr: "Imagine que tu rencontres dans la forêt une personne sage qui peut répondre à une question. Que demanderais-tu ?", mi: "Whakaarohia ka tūtaki koe ki tētahi tangata mōhio i te ngahere ka taea te whakautu i tētahi pātai. He aha tāu e pātai ai?", zh: "想象一下你在森林里遇到一位智者,他能回答一个问题。你会问什么?", sm: "Mafaufau pe ana e te fetaui ma se tagata atamai i le vaomatua e mafai ona tali se fesili e tasi. O le a lau fesili?" } },
      { id: "i44", type: "question", minTier: 1, emoji: "🌊", title: "Imagine you live in a city under the sea. How would you travel to school?", translations: { hi: "कल्पना कीजिए कि आप समुद्र के नीचे बसे शहर में रहते हैं। आप स्कूल कैसे जाते?", es: "Imagina que vives en una ciudad bajo el mar. ¿Cómo irías a la escuela?", fr: "Imagine que tu vis dans une ville sous la mer. Comment irais-tu à l'école ?", mi: "Whakaarohia kei te noho koe ki tētahi tāone i raro i te moana. Ka pēhea tō haere ki te kura?", zh: "想象一下你住在海底的城市里。你怎么去上学?", sm: "Mafaufau pe ana e te nofo i se aai i lalo o le sami. E faapefea ona e alu i le a'oga?" } },
      { id: "i45", type: "question", minTier: 0, emoji: "🚂", simple: "Imagine you build your own train! What would each carriage hold?", title: "Imagine if you could build your own train. What would each carriage hold?", translations: { hi: "कल्पना कीजिए कि आप अपनी ख़ुद की ट्रेन बना सकते। हर डिब्बे में क्या होता?", es: "Imagina que pudieras construir tu propio tren. ¿Qué llevaría cada vagón?", fr: "Imagine si tu pouvais construire ton propre train. Que contiendrait chaque wagon ?", mi: "Whakaarohia me i taea e koe te hanga i tō anō tereina. He aha kei ia whare tereina?", zh: "想象一下你可以建造自己的火车。每节车厢里会有什么?", sm: "Mafaufau pe ana e mafai ona e fau lau nofoaafi. O le a le mea o i totonu o taavale taitasi?" } },
      { id: "i46", type: "question", minTier: 1, emoji: "🏝️", title: "Imagine your class is stuck on a friendly island for a day. What job would everyone do?", translations: { hi: "कल्पना कीजिए कि आपकी कक्षा एक दिन के लिए एक दोस्ताना द्वीप पर फँस जाती है। हर कोई कौन सा काम करता?", es: "Imagina que tu clase queda atrapada un día en una isla amigable. ¿Qué trabajo haría cada uno?", fr: "Imagine que ta classe soit bloquée une journée sur une île accueillante. Quel rôle chacun aurait-il ?", mi: "Whakaarohia kua mahue tō akomanga ki tētahi motu atawhai mō te rā. He aha te mahi a ia tangata?", zh: "想象一下你们班被困在一个友好的小岛上一天。每个人会做什么工作?", sm: "Mafaufau pe ana ua taofia lou vasega i se motu aulelei mo le aso. O le a le galuega a tagata taitasi?" } },
      { id: "i47", type: "question", minTier: 2, emoji: "🔭", title: "Imagine you discover a new planet. What would you name it and who would live there?", translations: { hi: "कल्पना कीजिए कि आप एक नया ग्रह खोजते हैं। आप उसका क्या नाम रखेंगे और वहाँ कौन रहेगा?", es: "Imagina que descubres un planeta nuevo. ¿Cómo lo llamarías y quién viviría allí?", fr: "Imagine que tu découvres une nouvelle planète. Comment l'appellerais-tu et qui y vivrait ?", mi: "Whakaarohia ka kite koe i tētahi aorangi hou. He aha tōna ingoa, ā, ko wai ngā tāngata ka noho ki reira?", zh: "想象一下你发现了一颗新行星。你会给它起什么名字?谁会住在那里?", sm: "Mafaufau pe ana e te maua se paneta fou. O le a se igoa e te tuuina ai ma o ai e nofo ai?" } },
      { id: "i48", type: "question", minTier: 2, emoji: "⏱️", title: "Imagine if every wish lasted only one hour. What would you wish for?", translations: { hi: "कल्पना कीजिए कि हर इच्छा सिर्फ़ एक घंटे तक चलती। आप क्या माँगते?", es: "Imagina que cada deseo durara solo una hora. ¿Qué pedirías?", fr: "Imagine que chaque vœu ne dure qu'une heure. Que souhaiterais-tu ?", mi: "Whakaarohia me i kotahi noa te hāora e mau ai ia hiahia. He aha tāu e hiahia ai?", zh: "想象一下每个愿望只能持续一个小时。你会许什么愿?", sm: "Mafaufau pe ana e na o le tasi itula e tumau ai manaoga taitasi. O le a lau manaoga?" } },
      { id: "i49", type: "question", minTier: 2, emoji: "🕰️", title: "Imagine you could go back and give advice to your younger self. What would you say?", translations: { hi: "कल्पना कीजिए कि आप पीछे जाकर अपने छोटे रूप को सलाह दे सकते। आप क्या कहते?", es: "Imagina que pudieras volver atrás y darle un consejo a tu yo más joven. ¿Qué le dirías?", fr: "Imagine que tu puisses revenir en arrière et donner un conseil à ta version plus jeune. Que dirais-tu ?", mi: "Whakaarohia me i taea e koe te hoki whakamuri ki te hoatu tohutohu ki a koe i te wā i tamariki ai koe. He aha tāu e kī ai?", zh: "想象一下你可以回到过去,给年轻时的自己一个建议。你会说什么?", sm: "Mafaufau pe ana e mafai ona e toe foi ma tuuina atu se fautuaga i lou tuagane laʻitiiti. O le a lau tala?" } },
      { id: "i50", type: "question", minTier: 2, emoji: "📚", title: "Imagine you swap lives with a book character for a day. Who would you pick?", translations: { hi: "कल्पना कीजिए कि आप एक दिन के लिए किसी किताब के पात्र से अपनी ज़िंदगी बदलते हैं। आप किसे चुनते?", es: "Imagina que cambias de vida con un personaje de un libro por un día. ¿A quién elegirías?", fr: "Imagine que tu échanges ta vie avec un personnage de livre pour une journée. Lequel choisirais-tu ?", mi: "Whakaarohia ka whakawhiti koe i tō oranga ki tētahi tangata o tētahi pukapuka mō te rā. Ko wai tāu e kōwhiri ai?", zh: "想象一下你和书中的一个角色交换一天的生活。你会选谁?", sm: "Mafaufau pe ana e te fesuiai ma se tagata o se tusi mo le aso. O ai e te filifilia?" } },
      { id: "i51", type: "question", minTier: 3, emoji: "🌍", title: "Imagine every country shared one big holiday. What would it celebrate?", translations: { hi: "कल्पना कीजिए कि हर देश एक साझा बड़ा त्योहार मनाता। वह किस बात का जश्न होता?", es: "Imagina que todos los países compartieran una gran fiesta. ¿Qué celebraría?", fr: "Imagine que tous les pays partagent une grande fête. Que célébrerait-elle ?", mi: "Whakaarohia he hararei nui kotahi e tohatohahia ana e ngā whenua katoa. He aha tāna e whakanui ai?", zh: "想象一下所有国家共享一个盛大的节日。它会庆祝什么?", sm: "Mafaufau pe ana e tasi le aso malolo tele e faasoa e atunuu uma. O le a le mea e faamanatuina?" } },
      { id: "i52", type: "question", minTier: 3, emoji: "💡", title: "Imagine you could remove one invention from history. Which one would you remove and why?", translations: { hi: "कल्पना कीजिए कि आप इतिहास से एक आविष्कार हटा सकते। आप कौन सा हटाते और क्यों?", es: "Imagina que pudieras eliminar un invento de la historia. ¿Cuál eliminarías y por qué?", fr: "Imagine que tu puisses effacer une invention de l'histoire. Laquelle supprimerais-tu et pourquoi ?", mi: "Whakaarohia me i taea e koe te tango i tētahi mea hou o te hītori. Ko tēhea tāu e tango ai, he aha hoki?", zh: "想象一下你可以从历史上抹去一项发明。你会抹去哪一项?为什么?", sm: "Mafaufau pe ana e mafai ona e aveesea se mea na faia mai le tala faasolopito. O le fea e te aveesea ma aisea?" } },
      { id: "i53", type: "question", minTier: 1, emoji: "⚡", title: "Imagine there was no electricity for one day. How would your day go?", translations: { hi: "कल्पना कीजिए कि एक दिन बिजली बिल्कुल न होती। आपका दिन कैसे बीतता?", es: "Imagina que no hubiera electricidad por un día. ¿Cómo sería tu día?", fr: "Imagine qu'il n'y ait pas d'électricité pendant une journée. Comment se passerait ta journée ?", mi: "Whakaarohia kāore he hiko mō te rā kotahi. Ka pēhea tō rā?", zh: "想象一下一整天都没有电。你的一天会怎么过?", sm: "Mafaufau pe ana e leai se eletise mo le aso. E faapefea lau aso?" } },
      { id: "i54", type: "question", minTier: 0, emoji: "👖", simple: "Imagine a pocket that can hold anything! What would you keep in it?", title: "Imagine if you had a pocket that could hold anything. What would you keep in it?", translations: { hi: "कल्पना कीजिए कि आपके पास ऐसी जेब होती जिसमें कुछ भी समा सकता। आप उसमें क्या रखते?", es: "Imagina que tuvieras un bolsillo donde cupiera cualquier cosa. ¿Qué guardarías en él?", fr: "Imagine si tu avais une poche capable de tout contenir. Que mettrais-tu dedans ?", mi: "Whakaarohia he pūkoro e kaha ana ki te pupuri i tētahi mea. He aha tāu e whakaū ai ki roto?", zh: "想象一下你有一个什么都能装的口袋。你会在里面放什么?", sm: "Mafaufau pe ana i ai sau taga e mafai ona teu ai se mea uma. O le a le mea e te teuina i totonu?" } },
      { id: "i55", type: "question", minTier: 1, emoji: "🌱", title: "Imagine you could grow a garden anywhere in the world. Where would you plant it?", translations: { hi: "कल्पना कीजिए कि आप दुनिया में कहीं भी बगीचा उगा सकते। आप उसे कहाँ लगाते?", es: "Imagina que pudieras cultivar un jardín en cualquier parte del mundo. ¿Dónde lo plantarías?", fr: "Imagine que tu puisses faire pousser un jardin n'importe où dans le monde. Où le planterais-tu ?", mi: "Whakaarohia me i taea e koe te whakatipu māra ki hea rānei o te ao. Ka whakatō koe ki hea?", zh: "想象一下你可以在世界上任何地方种一座花园。你会种在哪里?", sm: "Mafaufau pe ana e mafai ona e totoina se togalaau i soo se mea o le lalolagi. O fea e te totoina ai?" } },
      { id: "i56", type: "question", minTier: 1, emoji: "🖼️", title: "Imagine you could step inside any painting. Which one would you choose?", translations: { hi: "कल्पना कीजिए कि आप किसी भी पेंटिंग के अंदर जा सकते। आप कौन सी चुनते?", es: "Imagina que pudieras entrar en cualquier pintura. ¿Cuál elegirías?", fr: "Imagine que tu puisses entrer dans n'importe quel tableau. Lequel choisirais-tu ?", mi: "Whakaarohia me i taea e koe te kuhu ki roto i tētahi peita. Ko tēhea tāu e kōwhiri ai?", zh: "想象一下你可以走进任何一幅画里。你会选哪一幅?", sm: "Mafaufau pe ana e mafai ona e ulu atu i se ata valiina. O le fea e te filifilia?" } },
      { id: "i57", type: "question", minTier: 0, emoji: "🧸", title: "Imagine your toys could do your chores. Which toy would do which job?", translations: { hi: "कल्पना कीजिए कि आपके खिलौने आपके घर के काम कर सकते। कौन सा खिलौना कौन सा काम करता?", es: "Imagina que tus juguetes pudieran hacer tus tareas de la casa. ¿Qué juguete haría qué trabajo?", fr: "Imagine que tes jouets puissent faire tes corvées. Quel jouet ferait quelle tâche ?", mi: "Whakaarohia me i taea e ō taonga tākaro te mahi i ō mahi whare. Ko tēhea taonga tākaro hei mahi i tēhea mahi?", zh: "想象一下你的玩具能帮你做家务。哪个玩具做哪件事?", sm: "Mafaufau pe ana e mafai e meataalo ona faia au galuega i le fale. O le fea meataalo e faia le fea galuega?" } },
      { id: "i58", type: "question", minTier: 0, emoji: "🌠", simple: "Imagine you catch a shooting star! What would you do with it?", title: "Imagine if you could catch a shooting star. What would you do with it?", translations: { hi: "कल्पना कीजिए कि आप एक टूटता तारा पकड़ सकते। आप उसका क्या करते?", es: "Imagina que pudieras atrapar una estrella fugaz. ¿Qué harías con ella?", fr: "Imagine si tu pouvais attraper une étoile filante. Qu'en ferais-tu ?", mi: "Whakaarohia me i taea e koe te hopu i tētahi whetū hinga. He aha tāu e mahi ai ki a ia?", zh: "想象一下你可以抓住一颗流星。你会用它做什么?", sm: "Mafaufau pe ana e mafai ona e pu'e se fetu tafe. O le a le mea e te faia ma ia?" } },
      { id: "i59", type: "question", minTier: 2, emoji: "🚀", title: "Imagine you were the first person to live on Mars. What would you miss most?", translations: { hi: "कल्पना कीजिए कि आप मंगल ग्रह पर रहने वाले पहले इंसान होते। आप सबसे ज़्यादा किसे याद करते?", es: "Imagina que fueras la primera persona en vivir en Marte. ¿Qué echarías más de menos?", fr: "Imagine que tu sois la première personne à vivre sur Mars. Qu'est-ce qui te manquerait le plus ?", mi: "Whakaarohia ko koe te tangata tuatahi ki te noho ki Mārehe. He aha te mea ka nui rawa tō ngaro ki a koe?", zh: "想象一下你是第一个住在火星上的人。你最想念什么?", sm: "Mafaufau pe ana o oe le tagata muamua e nofo i Mars. O le a le mea e sili ona e misia?" } },
      { id: "i60", type: "question", minTier: 1, emoji: "🏡", title: "Imagine you could design your dream bedroom with no limits. What would be inside?", translations: { hi: "कल्पना कीजिए कि आप बिना किसी सीमा के अपना सपनों का शयनकक्ष बना सकते। उसमें क्या होता?", es: "Imagina que pudieras diseñar tu dormitorio soñado sin límites. ¿Qué habría dentro?", fr: "Imagine que tu puisses concevoir la chambre de tes rêves sans aucune limite. Qu'y aurait-il dedans ?", mi: "Whakaarohia me i taea e koe te hoahoa i tō ruma moe moemoeā, kāore he tepe. He aha kei roto?", zh: "想象一下你可以无限制地设计自己梦想中的卧室。里面会有什么?", sm: "Mafaufau pe ana e mafai ona e fuafuaina lou potu moe e te manao i ai e aunoa ma se tapulaa. O le a le mea o i totonu?" } },
      { id: "i61", type: "question", minTier: 3, emoji: "🤝", title: "Imagine everyone could perfectly understand each other's feelings for one day. What would change?", translations: { hi: "कल्पना कीजिए कि एक दिन के लिए सब एक-दूसरे की भावनाओं को पूरी तरह समझ पाते। क्या बदल जाता?", es: "Imagina que todos pudieran entender perfectamente los sentimientos de los demás por un día. ¿Qué cambiaría?", fr: "Imagine que chacun puisse comprendre parfaitement les sentiments des autres pendant une journée. Qu'est-ce qui changerait ?", mi: "Whakaarohia me i mārama pai te katoa ki ngā kare ā-roto o tētahi atu mō te rā. He aha ngā huringa?", zh: "想象一下每个人都能在一天里完全理解彼此的感受。会有什么改变?", sm: "Mafaufau pe ana e malamalama atoatoa tagata uma i lagona o le tasi i le isi mo le aso. O le a le mea e suia?" } },
      { id: "i62", type: "question", minTier: 3, emoji: "🧭", title: "Imagine you had to lead an expedition with your class. Where would you go and who would do what?", translations: { hi: "कल्पना कीजिए कि आपको अपनी कक्षा के साथ एक अभियान का नेतृत्व करना पड़ता। आप कहाँ जाते और कौन क्या करता?", es: "Imagina que tuvieras que dirigir una expedición con tu clase. ¿Adónde irían y quién haría qué?", fr: "Imagine que tu doives diriger une expédition avec ta classe. Où irais-tu et qui ferait quoi ?", mi: "Whakaarohia me hautū koe i tētahi haerenga whakatūhura me tō akomanga. Ka haere koe ki hea, ā, ko wai hei mahi i tēhea mahi?", zh: "想象一下你要带领全班进行一次探险。你们会去哪里?谁负责什么?", sm: "Mafaufau pe ana e tatau ona e taitaia se malaga suʻesuʻe ma lou vasega. O fea e te alu i ai ma o ai e fai le a le galuega?" } },
      { id: "i63", type: "question", minTier: 2, emoji: "📡", title: "Imagine you could send a message to the future. Who would read it and what would you say?", translations: { hi: "कल्पना कीजिए कि आप भविष्य को एक संदेश भेज सकते। उसे कौन पढ़ता और आप क्या लिखते?", es: "Imagina que pudieras enviar un mensaje al futuro. ¿Quién lo leería y qué dirías?", fr: "Imagine que tu puisses envoyer un message dans le futur. Qui le lirait et que dirais-tu ?", mi: "Whakaarohia me i taea e koe te tuku karere ki te anamata. Ko wai ka pānui, ā, he aha tāu e kī ai?", zh: "想象一下你可以给未来发一条信息。谁会读到它?你会说什么?", sm: "Mafaufau pe ana e mafai ona e auina atu se feau i le lumanai. O ai e faitau ma o le a lau tala?" } },
      { id: "i64", type: "question", minTier: 0, emoji: "🌳", simple: "Imagine the playground has a talking tree! What would it tell you?", title: "Imagine if the playground had a talking tree. What would it tell you?", translations: { hi: "कल्पना कीजिए कि खेल के मैदान में एक बोलने वाला पेड़ होता। वह आपको क्या बताता?", es: "Imagina que el patio de recreo tuviera un árbol que habla. ¿Qué te diría?", fr: "Imagine si la cour de récréation avait un arbre qui parle. Que te dirait-il ?", mi: "Whakaarohia he rākau kōrero kei te papa tākaro. He aha tāna e kī ai ki a koe?", zh: "想象一下操场上有一棵会说话的树。它会对你说什么?", sm: "Mafaufau pe ana i ai se la'au e tautala i le malae ta'aloga. O le a le mea e fai atu ai ia te oe?" } },
      { id: "i65", type: "question", minTier: 0, emoji: "🎈", simple: "Imagine you float with balloons for a day! Where would you float?", title: "Imagine if you could float with balloons for a day. Where would you float?", translations: { hi: "कल्पना कीजिए कि आप एक दिन के लिए गुब्बारों के साथ तैर सकते। आप कहाँ तैरते?", es: "Imagina que pudieras flotar con globos por un día. ¿Adónde flotarías?", fr: "Imagine si tu pouvais flotter avec des ballons pendant une journée. Où flotterais-tu ?", mi: "Whakaarohia me i taea e koe te tere me ngā poihau mō te rā. Ka tere koe ki hea?", zh: "想象一下你可以抱着气球飘一整天。你会飘到哪里?", sm: "Mafaufau pe ana e mafai ona e opeopea ma pulu mo le aso. O fea e te opeopea i ai?" } },
      { id: "ia1", type: "activity", minTier: 0, emoji: "🐒", title: "Everyone act like their favourite animal for three seconds.", translations: { hi: "सब लोग तीन सेकंड के लिए अपने पसंदीदा जानवर की तरह अभिनय करें।", es: "Todos actúen como su animal favorito durante tres segundos.", fr: "Tout le monde imite son animal préféré pendant trois secondes.", mi: "Whakaari ai te katoa hei kararehe tino pai ki a rātou mō ngā hēkona e toru.", zh: "大家模仿自己最喜欢的动物三秒钟。", sm: "Tagata uma ia fai ma manu e sili ona latou fiafia i ai mo le tolu sekone." } },
      { id: "ia2", type: "activity", minTier: 0, emoji: "🤫", title: "Everyone whisper their favourite word to the person next to them.", translations: { hi: "सब लोग अपने बगल वाले व्यक्ति को अपना पसंदीदा शब्द फुसफुसाकर बताएँ।", es: "Todos susurren su palabra favorita a la persona de al lado.", fr: "Tout le monde chuchote son mot préféré à la personne à côté.", mi: "Whakapāha ai te katoa i tō rātou kupu tino pai ki te tangata kei tō rātou taha.", zh: "大家小声告诉旁边的人自己最喜欢的一个词。", sm: "Tagata uma ia musumusu le upu e sili ona latou fiafia i ai i le tagata o loo tu i o latou tafatafa." } },
      { id: "ia3", type: "activity", minTier: 0, emoji: "🚀", title: "Everyone count down from five and blast off out of your chair.", translations: { hi: "सब लोग पाँच से उल्टी गिनती करें और अपनी कुर्सी से उड़ान भरें।", es: "Todos cuenten regresivamente desde cinco y despeguen de su silla.", fr: "Tout le monde compte à rebours à partir de cinq et décolle de sa chaise.", mi: "Tatau ai te katoa mai i te rima ki raro, kātahi ka rere atu i tō tūru.", zh: "大家从五开始倒数,然后从椅子上\u201c发射\u201d起来。", sm: "Tagata uma ia faitau i lalo mai le lima ma osooso ese mai i lo latou nofoa." } },
      { id: "ia4", type: "activity", minTier: 0, emoji: "🖼️", title: "Everyone draw their answer to the last question in the air with their finger.", translations: { hi: "सब लोग पिछले सवाल का अपना जवाब अपनी उंगली से हवा में बनाएँ।", es: "Todos dibujen su respuesta a la última pregunta en el aire con el dedo.", fr: "Tout le monde dessine sa réponse à la dernière question dans l'air avec son doigt.", mi: "Tā ai te katoa i tā rātou whakautu mō te pātai o mua ki te rangi mā tō rātou maihao.", zh: "大家用手指在空中画出对上一个问题的答案。", sm: "Tagata uma ia ata i la latou tali mo le fesili talu ai i le ea i o latou tamatamailima." } },
      { id: "ia5", type: "activity", minTier: 0, emoji: "🤝", title: "Turn to a partner and share your idea in one sentence.", translations: { hi: "किसी साथी की ओर मुड़ें और अपना विचार एक वाक्य में साझा करें।", es: "Gírate hacia un compañero y comparte tu idea en una oración.", fr: "Tourne-toi vers un partenaire et partage ton idée en une phrase.", mi: "Huri atu ki tētahi hoa, ā, tohaina tō whakaaro ki roto i te rerenga kōrero kotahi.", zh: "转向一位同伴,用一句话分享你的想法。", sm: "Liliu atu i se paaga ma fa'asoa lou manatu i se fuaiupu e tasi." } },
      { id: "i21", type: "question", minTier: 0, emoji: "🎒", title: "Imagine if your backpack could talk about everything it's seen this week. What would it say?", translations: { hi: "कल्पना करें कि आपका बैग इस हफ्ते जो कुछ देखा उसके बारे में बात कर सकता। यह क्या कहता?", es: "Imagina si tu mochila pudiera hablar de todo lo que ha visto esta semana. ¿Qué diría?", fr: "Imagine si ton sac à dos pouvait parler de tout ce qu'il a vu cette semaine. Que dirait-il ?", mi: "Whakaarohia mehemea ka taea e tō pēke te kōrero mō ngā mea katoa i kitea e ia i tēnei wiki. He aha tāna e kī ai?", zh: "想象一下,如果你的书包能讲讲这周它看到的一切。它会说什么?", sm: "Mafaufau pe ana mafai e lau ato ona talanoa i mea uma na ia vaai i ai i lenei vaiaso. O le a fai mai ai?" } },
      { id: "i22", type: "question", minTier: 0, emoji: "🛝", title: "Imagine if every staircase in the world became a slide. How would that change your day?", translations: { hi: "कल्पना करें कि दुनिया की हर सीढ़ी स्लाइड बन जाती। इससे आपका दिन कैसे बदल जाता?", es: "Imagina si cada escalera del mundo se convirtiera en un tobogán. ¿Cómo cambiaría eso tu día?", fr: "Imagine si chaque escalier du monde devenait un toboggan. Comment cela changerait-il ta journée ?", mi: "Whakaarohia mehemea ka huri ngā arawhata katoa o te ao hei rerenga. He pēhea te huri o tō rā?", zh: "想象一下,如果世界上所有的楼梯都变成了滑梯。这会怎样改变你的一天?", sm: "Mafaufau pe ana liua faasitepu uma i le lalolagi i se se'eaga. E fa'apefea ona suia ai lou aso?" } },
      { id: "i23", type: "question", minTier: 1, emoji: "☁️", title: "Imagine if clouds could hold onto objects and drop them later. What might fall from the sky today?", translations: { hi: "कल्पना करें कि बादल चीज़ों को पकड़ सकते और बाद में गिरा सकते। आज आसमान से क्या गिर सकता है?", es: "Imagina si las nubes pudieran sujetar objetos y dejarlos caer más tarde. ¿Qué podría caer del cielo hoy?", fr: "Imagine si les nuages pouvaient tenir des objets et les laisser tomber plus tard. Qu'est-ce qui pourrait tomber du ciel aujourd'hui ?", mi: "Whakaarohia mehemea ka taea e ngā kapua te pupuri mea, kia taka rānei i muri mai. He aha pea ka taka mai i te rangi i tēnei rā?", zh: "想象一下,如果云可以抓住物体,过一会儿再掉下来。今天天上可能会掉下什么?", sm: "Mafaufau pe ana mafai e ao ona uuina mea ma tuu ese i se taimi mulimuli ane. O le a le mea e ono pa'u mai le lagi i le aso nei?" } },
      { id: "i24", type: "question", minTier: 2, emoji: "🚪", title: "Imagine you're being chased by a giant marshmallow through a cloud kingdom! Four doors float in front of you. 🔴 Red opens to a steep drop into darkness. 🔵 Blue is filled with cake so thick you can't see through it. 🟡 Yellow is full of gently floating feathers. 🟢 Green leads to a spiral staircase made of light. Which door would you imagine picking, and why?", translations: { hi: "कल्पना करें कि एक विशाल मार्शमैलो बादलों के राज्य में आपका पीछा कर रहा है! चार दरवाज़े आपके सामने तैर रहे हैं। 🔴 लाल अंधेरे में तेज़ गिरावट की ओर खुलता है। 🔵 नीला केक से इतना भरा है कि आप उसके पार नहीं देख सकते। 🟡 पीला हल्के से तैरते पंखों से भरा है। 🟢 हरा रोशनी से बनी घुमावदार सीढ़ी की ओर जाता है। आप कल्पना में कौन सा दरवाज़ा चुनेंगे, और क्यों?", es: "¡Imagina que un malvavisco gigante te persigue por un reino de nubes! Cuatro puertas flotan frente a ti. 🔴 La roja se abre a una caída empinada hacia la oscuridad. 🔵 La azul está llena de pastel tan espeso que no puedes ver a través. 🟡 La amarilla está llena de plumas flotando suavemente. 🟢 La verde lleva a una escalera en espiral hecha de luz. ¿Qué puerta imaginarías elegir, y por qué?", fr: "Imagine qu'une guimauve géante te poursuit à travers un royaume de nuages ! Quatre portes flottent devant toi. 🔴 La rouge s'ouvre sur une chute abrupte dans l'obscurité. 🔵 La bleue est remplie de gâteau si épais que tu ne peux pas voir à travers. 🟡 La jaune est pleine de plumes qui flottent doucement. 🟢 La verte mène à un escalier en spirale fait de lumière. Quelle porte imaginerais-tu choisir, et pourquoi ?", mi: "Whakaarohia kei te whai tētahi mātimati nui i a koe puta noa i tētahi kīngitanga kapua! E rere ana ngā kūaha e whā ki mua i a koe. 🔴 Ko te whero ka tuwhera ki tētahi hekenga poutūtanga ki te pōuri. 🔵 Ko te kikorangi kua kī tonu i te keke, mātotoru rawa e kore e kitea. 🟡 Ko te kōwhai kua kī i ngā huruhuru e rere māhaki ana. 🟢 Ko te kākāriki e ahu ana ki tētahi arawhata koili i hangaia mai i te rama. Ko tēhea kūaha tāu e whakaaro ai ki te kōwhiri, ā, he aha ai?", zh: "想象一个巨大的棉花糖正在云朵王国里追你!四扇门漂浮在你面前。🔴 红色打开是陡峭地坠入黑暗。🔵 蓝色里塞满了蛋糕,厚到你看不透。🟡 黄色里充满了轻轻飘浮的羽毛。🟢 绿色通向一个由光构成的螺旋楼梯。你会想象选哪扇门,为什么?", sm: "Mafaufau o lo'o tuli oe e se tama'i mariuma tele i totonu o se malo ao! E fa faitotoa o lo'o opeopea i ou luma. 🔴 O le mumu e tatala atu i se paʻu maulalo i le pouliuli. 🔵 O le lanumoana ua tumu i keke ma'ai tele e le mafai ona vaai i totonu. 🟡 O le samasama ua tumu i fulu o lo'o opeopea lemu. 🟢 O le lanumeamata e tau atu i se apefaʻi fa'ata'amilo na faia i le malamalama. O le fea faitotoa e te mafaufau e filifilia, ma aisea?" } },
      { id: "i25", type: "question", minTier: 2, emoji: "🤖", title: "Imagine your classroom turned into a maze chased by a friendly but very fast robot! Four exits appear. 🔴 Red leads to a room full of mirrors. 🔵 Blue is blocked by a wall of soft cake you can't see past. 🟡 Yellow opens onto a trampoline floor. 🟢 Green is silent and pitch dark. Which exit would you imagine taking, and why?", translations: { hi: "कल्पना करें कि आपकी कक्षा एक भूलभुलैया में बदल गई है और एक दोस्ताना लेकिन बहुत तेज़ रोबोट आपका पीछा कर रहा है! चार निकास दिखाई देते हैं। 🔴 लाल एक ऐसे कमरे की ओर जाता है जो शीशों से भरा है। 🔵 नीला नरम केक की दीवार से रुका है जिसके पार आप नहीं देख सकते। 🟡 पीला एक ट्रैम्पोलिन फर्श की ओर खुलता है। 🟢 हरा शांत है और घोर अंधेरा है। आप कल्पना में कौन सा निकास लेंगे, और क्यों?", es: "¡Imagina que tu salón de clases se convirtió en un laberinto perseguido por un robot amistoso pero muy rápido! Aparecen cuatro salidas. 🔴 La roja lleva a una sala llena de espejos. 🔵 La azul está bloqueada por una pared de pastel suave que no puedes ver más allá. 🟡 La amarilla se abre a un suelo de trampolín. 🟢 La verde está en silencio y completamente oscura. ¿Qué salida imaginarías tomar, y por qué?", fr: "Imagine que ta salle de classe se transforme en labyrinthe poursuivi par un robot amical mais très rapide ! Quatre sorties apparaissent. 🔴 La rouge mène à une pièce pleine de miroirs. 🔵 La bleue est bloquée par un mur de gâteau moelleux que tu ne peux pas voir au-delà. 🟡 La jaune s'ouvre sur un sol de trampoline. 🟢 La verte est silencieuse et complètement sombre. Quelle sortie imaginerais-tu prendre, et pourquoi ?", mi: "Whakaarohia kua huri tō akomanga hei araara, ā, kei te whai tētahi karetao whakahoa engari tino tere i a koe! Ka puta ngā putanga e whā. 🔴 Ko te whero e ahu ana ki tētahi rūma kua kī i ngā whakaata. 🔵 Ko te kikorangi kua ārai e tētahi pakitara keke ngāwari, e kore e kitea he aha kei tua. 🟡 Ko te kōwhai ka tuwhera ki tētahi papa poroherehere. 🟢 Ko te kākāriki he wahangū, he pōuri hoki. Ko tēhea putanga tāu e whakaaro ai ki te haere, ā, he aha ai?", zh: "想象你的教室变成了一个迷宫,一个友好但速度极快的机器人在追你!出现了四个出口。🔴 红色通向一个满是镜子的房间。🔵 蓝色被一堵柔软的蛋糕墙挡住,你看不到那边是什么。🟡 黄色打开是一片蹦床地板。🟢 绿色安静又漆黑一片。你会想象走哪个出口,为什么?", sm: "Mafaufau ua liua lau potuaoga i se alaleo ma o lo'o tuli oe e se robot agalelei ae televave tele! E fa faitotoa e aliali mai. 🔴 O le mumu e tau atu i se potu tumu i faaata. 🔵 O le lanumoana ua poloka e se puipui keke malu e le mafai ona vaai i tua atu. 🟡 O le samasama e tatala atu i se fola osooso. 🟢 O le lanumeamata e filemu ma pouliuli tele. O le fea faitotoa e te mafaufau e alu ai, ma aisea?" } },
      { id: "i26", type: "question", minTier: 0, emoji: "📏", title: "Imagine if your class could remove one classroom rule for a day. Which would you pick?", translations: { hi: "कल्पना करें कि आपकी कक्षा एक दिन के लिए कक्षा का कोई एक नियम हटा सकती। आप कौन सा चुनेंगे?", es: "Imagina si tu clase pudiera eliminar una regla del salón por un día. ¿Cuál elegirías?", fr: "Imagine si ta classe pouvait supprimer une règle de classe pour une journée. Laquelle choisirais-tu ?", mi: "Whakaarohia mehemea ka taea e tō akomanga te tango i tētahi ture akomanga mō te rā kotahi. Ko tēhea tāu e kōwhiri?", zh: "想象一下，如果你的班级可以取消一条班规一天。你会选哪一条？", sm: "Mafaufau pe ana mafai e lau vasega ona aveese se tasi tulafono a le potuaoga mo le aso e tasi. O le fea e te filifilia?" } },
      { id: "i27", type: "question", minTier: 0, emoji: "🌈", title: "Imagine if every raindrop was a different colour. What would a rainy day look like?", translations: { hi: "कल्पना करें कि हर बारिश की बूंद अलग रंग की होती। बारिश का दिन कैसा दिखता?", es: "Imagina si cada gota de lluvia fuera de un color diferente. ¿Cómo se vería un día lluvioso?", fr: "Imagine si chaque goutte de pluie était d'une couleur différente. À quoi ressemblerait un jour de pluie ?", mi: "Whakaarohia mehemea he tae rerekē tā ia pata ua. He pēhea te āhua o tētahi rā ua?", zh: "想象一下，如果每一滴雨都是不同的颜色。下雨天会是什么样子？", sm: "Mafaufau pe ana eseese lanu o mataʻitusi timu taʻitasi. E fa'apefea le foliga o se aso timu?" } },
      { id: "i28", type: "question", minTier: 0, emoji: "🗄️", title: "Imagine if your desk had a secret drawer that refilled with a surprise each morning. What would you hope for?", translations: { hi: "कल्पना करें कि आपकी डेस्क में एक गुप्त दराज़ है जो हर सुबह एक सरप्राइज़ से भर जाती है। आप क्या पाने की उम्मीद करेंगे?", es: "Imagina si tu escritorio tuviera un cajón secreto que se rellenara con una sorpresa cada mañana. ¿Qué esperarías encontrar?", fr: "Imagine si ton bureau avait un tiroir secret qui se remplissait d'une surprise chaque matin. Qu'espérerais-tu trouver ?", mi: "Whakaarohia mehemea he kōpaki huna tō tō tēpu e kī anō ai i tētahi mea ohorere ia ata. He aha tāu e tūmanako ai?", zh: "想象一下，如果你的书桌有一个秘密抽屉，每天早上都会装满一个惊喜。你会希望是什么？", sm: "Mafaufau pe ana i ai se apoo lilo o lau kesi e faatumu i se mea faateiaina i taeao taitasi. O le a le mea e te faamoemoe i ai?" } },
      { id: "i29", type: "question", minTier: 1, emoji: "🔄", title: "Imagine if teachers and students swapped roles for the morning. What would you teach?", translations: { hi: "कल्पना करें कि सुबह के लिए शिक्षक और छात्र अपनी भूमिकाएं बदल लेते। आप क्या पढ़ाएंगे?", es: "Imagina si maestros y estudiantes intercambiaran roles por la mañana. ¿Qué enseñarías?", fr: "Imagine si les enseignants et les élèves échangeaient leurs rôles pour la matinée. Qu'enseignerais-tu ?", mi: "Whakaarohia mehemea ka whakawhiti tūranga ngā kaiako me ngā ākonga mō te ata. He aha tāu e whakaako ai?", zh: "想象一下，如果老师和学生在早上互换角色。你会教什么？", sm: "Mafaufau pe ana fesuia'i matafaioi faiaoga ma tamaiti aoga mo le taeao. O le a le mea e te aoao atu?" } },
      { id: "i30", type: "question", minTier: 0, emoji: "📖", title: "Imagine if your school library could bring any book character to life for an hour. Who would you choose?", translations: { hi: "कल्पना करें कि आपकी स्कूल लाइब्रेरी किसी भी किताब के किरदार को एक घंटे के लिए जीवित कर सकती। आप किसे चुनेंगे?", es: "Imagina si la biblioteca de tu escuela pudiera dar vida a cualquier personaje de libro por una hora. ¿A quién elegirías?", fr: "Imagine si la bibliothèque de ton école pouvait donner vie à un personnage de livre pendant une heure. Qui choisirais-tu ?", mi: "Whakaarohia mehemea ka taea e te whare pukapuka o tō kura te whakaora i tētahi kiripuaki pukapuka mō te haora kotahi. Ko wai tāu e kōwhiri?", zh: "想象一下，如果你学校的图书馆能让任何一本书里的角色活过来一个小时。你会选谁？", sm: "Mafaufau pe ana mafai e le faletusi a lau aoga ona faaolaina soo se tagata i totonu o se tusi mo le itula e tasi. O ai e te filifilia?" } },
      { id: "i31", type: "question", minTier: 0, emoji: "🔔", title: "Imagine if the school bell made a different animal sound each time. Which sound would you choose for lunchtime?", translations: { hi: "कल्पना करें कि स्कूल की घंटी हर बार एक अलग जानवर की आवाज़ करती। आप लंच टाइम के लिए कौन सी आवाज़ चुनेंगे?", es: "Imagina si la campana de la escuela hiciera un sonido de animal diferente cada vez. ¿Qué sonido elegirías para el almuerzo?", fr: "Imagine si la cloche de l'école faisait un bruit d'animal différent à chaque fois. Quel son choisirais-tu pour le déjeuner ?", mi: "Whakaarohia mehemea he tangi kararehe rerekē tā te pere o te kura ia wā e tangi ai. He aha te tangi e kōwhiri ai koe mō te tina?", zh: "想象一下，如果学校的铃声每次都发出不同的动物叫声。你会为午餐时间选哪种声音？", sm: "Mafaufau pe ana eseese leo manu e faia e le logo o le aoga i taimi taʻitasi. O le a le leo e te filifilia mo le taimi o le taumafataga?" } },
      { id: "i32", type: "question", minTier: 0, emoji: "✍️", title: "Imagine if your handwriting came to life and could walk around the page. What would it get up to?", translations: { hi: "कल्पना करें कि आपकी लिखावट जीवित हो जाती और पेज पर घूम सकती। यह क्या करती?", es: "Imagina si tu letra cobrara vida y pudiera caminar por la página. ¿Qué haría?", fr: "Imagine si ton écriture prenait vie et pouvait se promener sur la page. Que ferait-elle ?", mi: "Whakaarohia mehemea ka ora tō tuhi ā-ringa, ā, ka taea te hīkoi haere i runga i te whārangi. He aha ana mahi?", zh: "想象一下，如果你的字迹活了过来，可以在纸上到处走动。它会做些什么？", sm: "Mafaufau pe ana ola au tusitusiga ma savavali i luga o le itulau. O le a ana mea e faia?" } },
      { id: "i33", type: "question", minTier: 0, emoji: "🌱", title: "Imagine if you could plant a seed that grew into anything you wanted, not just a plant. What would you grow?", translations: { hi: "कल्पना करें कि आप एक एसा बीज बो सकते जो आपकी चाही हुई किसी भी चीज़ में उग जाए, सिर्फ पौधे में नहीं। आप क्या उगाएंगे?", es: "Imagina si pudieras plantar una semilla que creciera hasta convertirse en cualquier cosa que quisieras, no solo una planta. ¿Qué cultivarías?", fr: "Imagine si tu pouvais planter une graine qui deviendrait tout ce que tu veux, pas seulement une plante. Que ferais-tu pousser ?", mi: "Whakaarohia mehemea ka taea e koe te whakatō i tētahi kākano ka tupu hei aha noa e hiahiatia ana e koe, kaua ko te tipu anake. He aha tāu e whakatupu?", zh: "想象一下，如果你可以种下一颗种子，它能长成你想要的任何东西，而不只是植物。你会种出什么？", sm: "Mafaufau pe ana mafai ona e totōina se fatu e tupu i so'o se mea e te manaʻo ai, e le naʻo se laau. O le a lau mea e faatupu?" } },
      { id: "i34", type: "question", minTier: 0, emoji: "🌳", title: "Imagine if your class had a treehouse instead of a classroom. What would lessons look like up there?", translations: { hi: "कल्पना करें कि आपकी कक्षा के पास कक्षा की जगह एक ट्री हाउस होता। वहां पाठ कैसे दिखते?", es: "Imagina si tu clase tuviera una casa del árbol en lugar de un salón. ¿Cómo serían las lecciones allá arriba?", fr: "Imagine si ta classe avait une cabane dans les arbres au lieu d'une salle de classe. À quoi ressembleraient les leçons là-haut ?", mi: "Whakaarohia mehemea he whare rākau tō tō akomanga, kaua he rūma ako. He pēhea ngā akoranga i runga rā?", zh: "想象一下，如果你的班级有一个树屋而不是教室。在那上面上课会是什么样子？", sm: "Mafaufau pe ana i ai se fale i luga o le laau a lau vasega nai lo se potuaoga. E fa'apefea lesona i luga?" } },
      { id: "i35", type: "question", minTier: 1, emoji: "🌕", title: "Imagine if every full moon, one rule of gravity changed for a night. What would you hope changes?", translations: { hi: "कल्पना करें कि हर पूर्णिमा पर, एक रात के लिए गुरुत्वाकर्षण का एक नियम बदल जाता। आप क्या बदलने की उम्मीद करेंगे?", es: "Imagina si cada luna llena, una regla de la gravedad cambiara por una noche. ¿Qué esperarías que cambiara?", fr: "Imagine si à chaque pleine lune, une règle de la gravité changeait pour une nuit. Qu'espérerais-tu voir changer ?", mi: "Whakaarohia mehemea i ia marama kī, ka huri tētahi ture kukume mō te pō kotahi. He aha tāu e tūmanako ka huri?", zh: "想象一下，如果每逢满月，重力的一条规则就会改变一个晚上。你希望会有什么变化？", sm: "Mafaufau pe ana i masina atoa taitasi, e suia se tasi tulafono o le kalave mo le po e tasi. O le a le mea e te faamoemoe e suia?" } },
    ],
  },
  {
    id: "quick",
    emoji: "⚡",
    title: "Super Quick",
    description: "Fast little picks for spare minutes between lessons.",
    descTranslations: { hi: "पाठों के बीच खाली मिनटों के लिए तेज़ छोटे चुनाव।", es: "Elecciones rápidas para los minutos libres entre clases.", fr: "De petits choix rapides pour les minutes libres entre les cours.", mi: "He kōwhiringa iti tere mō ngā meneti wātea i waenganui i ngā akoranga.", zh: "课间空闲时间的快速小选择。", sm: "Ni filifiliga vave mo minute avanoa i le va o vasega." },
    cards: [
      { id: "q1", type: "question", minTier: 0, emoji: "🐱", title: "Cats or dogs?", translations: { hi: "बिल्ली या कुत्ता?", es: "¿Gatos o perros?", fr: "Chats ou chiens ?", mi: "Ngeru, kurī rānei?", zh: "猫还是狗?", sm: "Pusi po'o ta'ifau?" } },
      { id: "q2", type: "question", minTier: 0, emoji: "☀️", title: "Summer or winter?", translations: { hi: "गर्मी या सर्दी?", es: "¿Verano o invierno?", fr: "Été ou hiver ?", mi: "Raumati, hōtoke rānei?", zh: "夏天还是冬天?", sm: "Taumafanafana po'o taumalulu?" } },
      { id: "q3", type: "question", minTier: 0, emoji: "🎨", title: "Reading or drawing?", translations: { hi: "पढ़ना या चित्र बनाना?", es: "¿Leer o dibujar?", fr: "Lire ou dessiner ?", mi: "Pānui, tā whakaahua rānei?", zh: "阅读还是画画?", sm: "Faitau po'o ata?" } },
      { id: "q4", type: "question", minTier: 0, emoji: "🍫", title: "Chocolate or lollies?", translations: { hi: "चॉकलेट या लॉलीज़?", es: "¿Chocolate o caramelos?", fr: "Chocolat ou bonbons ?", mi: "Tiakarete, rare rānei?", zh: "巧克力还是糖果?", sm: "Sukalati po'o lole?" } },
      { id: "q5", type: "question", minTier: 0, emoji: "🌅", title: "Morning or afternoon?", translations: { hi: "सुबह या दोपहर?", es: "¿Mañana o tarde?", fr: "Matin ou après-midi ?", mi: "Ata, ahiahi rānei?", zh: "早上还是下午?", sm: "Taeao po'o afiafi?" } },
      { id: "q6", type: "question", minTier: 0, emoji: "🏖️", title: "Beach or bush?", translations: { hi: "समुद्र तट या जंगल?", es: "¿Playa o bosque?", fr: "Plage ou forêt ?", mi: "Takutai, ngahere rānei?", zh: "海滩还是丛林?", sm: "Matafaga po'o le vaomatua?" } },
      { id: "q7", type: "question", minTier: 0, emoji: "🧙", title: "Superhero or wizard?", translations: { hi: "सुपरहीरो या जादूगर?", es: "¿Superhéroe o mago?", fr: "Super-héros ou magicien ?", mi: "Toa mana nui, tohunga makutu rānei?", zh: "超级英雄还是巫师?", sm: "Toa mana po'o le tagata faataulaitu?" } },
      { id: "q8", type: "question", minTier: 0, emoji: "🍕", title: "Pizza or fish and chips?", translations: { hi: "पिज़्ज़ा या फिश एंड चिप्स?", es: "¿Pizza o pescado con papas fritas?", fr: "Pizza ou fish and chips ?", mi: "Parehe, ika me ngā rīwai rānei?", zh: "披萨还是炸鱼薯条?", sm: "Pizza po'o i'a ma pateta falai?" } },
      { id: "q9", type: "question", minTier: 0, emoji: "🏠", title: "Indoors or outdoors?", translations: { hi: "घर के अंदर या बाहर?", es: "¿Adentro o afuera?", fr: "À l'intérieur ou à l'extérieur ?", mi: "I roto, i waho rānei?", zh: "室内还是室外?", sm: "I totonu po'o i fafo?" } },
      { id: "q10", type: "question", minTier: 0, emoji: "🏉", title: "Rugby or netball?", translations: { hi: "रग्बी या नेटबॉल?", es: "¿Rugby o netball?", fr: "Rugby ou netball ?", mi: "Whutupōro, poitūkohu rānei?", zh: "橄榄球还是无板篮球?", sm: "Lakapi po'o le netipolo?" } },
      { id: "q11", type: "question", minTier: 0, emoji: "🏔️", title: "Mountains or ocean?", translations: { hi: "पहाड़ या समुद्र?", es: "¿Montañas u océano?", fr: "Montagnes ou océan ?", mi: "Maunga, moana rānei?", zh: "山还是海洋?", sm: "Mauga po'o le sami?" } },
      { id: "q12", type: "question", minTier: 0, emoji: "🎲", title: "Board games or video games?", translations: { hi: "बोर्ड गेम्स या वीडियो गेम्स?", es: "¿Juegos de mesa o videojuegos?", fr: "Jeux de société ou jeux vidéo ?", mi: "Ngā tākaro papa, ngā tākaro ataata rānei?", zh: "桌游还是电子游戏?", sm: "Ta'aloga laupapa po'o ta'aloga vitiō?" } },
      { id: "q13", type: "question", minTier: 0, emoji: "🦉", title: "Early bird or night owl?", translations: { hi: "जल्दी उठने वाले या देर रात तक जागने वाले?", es: "¿Madrugador o noctámbulo?", fr: "Lève-tôt ou couche-tard ?", mi: "Manu ata, ruru pō rānei?", zh: "早起的鸟儿还是夜猫子?", sm: "E ala vave po'o e ala tuai?" } },
      { id: "q14", type: "question", minTier: 0, emoji: "📞", title: "Text or call?", translations: { hi: "टेक्स्ट या कॉल?", es: "¿Mensaje de texto o llamada?", fr: "SMS ou appel ?", mi: "Karere kupu, waea rānei?", zh: "发短信还是打电话?", sm: "Feau tusitusi po'o telefoni?" } },
      { id: "q15", type: "question", minTier: 0, emoji: "🍋", title: "Sweet or sour?", translations: { hi: "मीठा या खट्टा?", es: "¿Dulce o agrio?", fr: "Sucré ou acide ?", mi: "Reka, kawa rānei?", zh: "甜的还是酸的?", sm: "Suamalie po'o mea oona?" } },
      { id: "q16", type: "question", minTier: 0, emoji: "🛹", title: "Skateboard or bike?", translations: { hi: "स्केटबोर्ड या साइकिल?", es: "¿Patineta o bicicleta?", fr: "Skateboard ou vélo ?", mi: "Papa retireti, paihikara rānei?", zh: "滑板还是自行车?", sm: "Laupapa fa'ase'e po'o le uila?" } },
      { id: "q17", type: "question", minTier: 0, emoji: "📖", title: "Comics or novels?", translations: { hi: "कॉमिक्स या उपन्यास?", es: "¿Cómics o novelas?", fr: "Bandes dessinées ou romans ?", mi: "Pukapuka whakakatakata, pukapuka roa rānei?", zh: "漫画还是小说?", sm: "Tala pese po'o tusi tala?" } },
      { id: "q18", type: "question", minTier: 0, emoji: "⛺", title: "Camping or hotel?", translations: { hi: "कैंपिंग या होटल?", es: "¿Acampar o ir a un hotel?", fr: "Camping ou hôtel ?", mi: "Puni, hōtera rānei?", zh: "露营还是酒店?", sm: "Tolauapiga po'o faletalimalo?" } },
      { id: "q19", type: "question", minTier: 0, emoji: "🏀", title: "Basketball or soccer?", translations: { hi: "बास्केटबॉल या फुटबॉल?", es: "¿Baloncesto o fútbol?", fr: "Basket ou foot ?", mi: "Poitūkohu, whutupaoro rānei?", zh: "篮球还是足球?", sm: "Pasiketipolo po'o le lakapi soka?" } },
      { id: "q20", type: "question", minTier: 0, emoji: "🎤", title: "Karaoke or dancing?", translations: { hi: "कराओके या डांसिंग?", es: "¿Karaoke o baile?", fr: "Karaoké ou danse ?", mi: "Karaoke, kanikani rānei?", zh: "卡拉OK还是跳舞?", sm: "Karaoke po'o siva?" } },
      { id: "q36", type: "question", minTier: 0, emoji: "🌅", title: "Sunrise or sunset?", translations: { hi: "सूर्योदय या सूर्यास्त?", es: "¿Amanecer o atardecer?", fr: "Lever ou coucher de soleil ?", mi: "Te putanga o te rā, te to o te rā rānei?", zh: "日出还是日落?", sm: "Tula'i mai o le la po'o le goto o le la?" } },
      { id: "q37", type: "question", minTier: 0, emoji: "🌦️", title: "Rain or sunshine?", translations: { hi: "बारिश या धूप?", es: "¿Lluvia o sol?", fr: "Pluie ou soleil ?", mi: "Te ua, te rā rānei?", zh: "下雨还是晴天?", sm: "Timu po'o le la?" } },
      { id: "q38", type: "question", minTier: 0, emoji: "⛄", title: "Snowman or sandcastle?", translations: { hi: "स्नोमैन या रेत का महल?", es: "¿Muñeco de nieve o castillo de arena?", fr: "Bonhomme de neige ou château de sable ?", mi: "Tangata hukarere, whare onepū rānei?", zh: "雪人还是沙堡?", sm: "Tagata kiona po'o fale oneone?" } },
      { id: "q39", type: "question", minTier: 0, emoji: "🚆", title: "Bus or train?", translations: { hi: "बस या ट्रेन?", es: "¿Autobús o tren?", fr: "Bus ou train ?", mi: "Pahi, tereina rānei?", zh: "公共汽车还是火车?", sm: "Pasi po'o nofoaafi?" } },
      { id: "q40", type: "question", minTier: 0, emoji: "🏏", title: "Cricket or rugby?", translations: { hi: "क्रिकेट या रग्बी?", es: "¿Críquet o rugby?", fr: "Cricket ou rugby ?", mi: "Kirikiti, whutupōro rānei?", zh: "板球还是橄榄球?", sm: "Kirikiti po'o lakapi?" } },
      { id: "q41", type: "question", minTier: 0, emoji: "🍦", title: "Ice cream or cake?", translations: { hi: "आइसक्रीम या केक?", es: "¿Helado o pastel?", fr: "Glace ou gâteau ?", mi: "Aihikirīmi, keke rānei?", zh: "冰淇淋还是蛋糕?", sm: "Aisakulimi po'o keke?" } },
      { id: "q42", type: "question", minTier: 0, emoji: "🍌", title: "Banana or apple?", translations: { hi: "केला या सेब?", es: "¿Plátano o manzana?", fr: "Banane ou pomme ?", mi: "Panana, āporo rānei?", zh: "香蕉还是苹果?", sm: "Fa'i po'o apelu?" } },
      { id: "q43", type: "question", minTier: 0, emoji: "🥪", title: "Sandwich or salad?", translations: { hi: "सैंडविच या सलाद?", es: "¿Sándwich o ensalada?", fr: "Sandwich ou salade ?", mi: "Hanawiti, huamata rānei?", zh: "三明治还是沙拉?", sm: "Sanuisi po'o salati?" } },
      { id: "q44", type: "question", minTier: 0, emoji: "🌳", title: "Garden or playground?", translations: { hi: "बगीचा या खेल का मैदान?", es: "¿Jardín o patio de recreo?", fr: "Jardin ou terrain de jeu ?", mi: "Māra, papa tākaro rānei?", zh: "花园还是游乐场?", sm: "Togalaau po'o malae ta'aloga?" } },
      { id: "q45", type: "question", minTier: 0, emoji: "📖", title: "Story or song?", translations: { hi: "कहानी या गीत?", es: "¿Cuento o canción?", fr: "Histoire ou chanson ?", mi: "Pūrākau, waiata rānei?", zh: "故事还是歌曲?", sm: "Tala po'o pese?" } },
      { id: "q46", type: "question", minTier: 0, emoji: "⭐", title: "Stars or clouds?", translations: { hi: "तारे या बादल?", es: "¿Estrellas o nubes?", fr: "Étoiles ou nuages ?", mi: "Ngā whetū, ngā kapua rānei?", zh: "星星还是云朵?", sm: "Fetu po'o ao?" } },
      { id: "q47", type: "question", minTier: 0, emoji: "🌈", title: "Rainbow or lightning?", translations: { hi: "इंद्रधनुष या बिजली?", es: "¿Arcoíris o rayo?", fr: "Arc-en-ciel ou éclair ?", mi: "Āniwaniwa, uira rānei?", zh: "彩虹还是闪电?", sm: "Nuanua po'o uila?" } },
      { id: "q48", type: "question", minTier: 0, emoji: "🚲", title: "Walking or biking to school?", translations: { hi: "स्कूल पैदल जाना या साइकिल से?", es: "¿Ir a la escuela caminando o en bici?", fr: "Aller à l'école à pied ou à vélo ?", mi: "Hīkoi, eke pahikara rānei ki te kura?", zh: "走路还是骑自行车去学校?", sm: "Savali po'o ti'eti'e i le pasikala i le a'oga?" } },
      { id: "q49", type: "question", minTier: 0, emoji: "🥛", title: "Milk or water?", translations: { hi: "दूध या पानी?", es: "¿Leche o agua?", fr: "Lait ou eau ?", mi: "Miraka, wai rānei?", zh: "牛奶还是水?", sm: "Susu po'o vai?" } },
      { id: "q50", type: "question", minTier: 0, emoji: "🍚", title: "Bread or rice?", translations: { hi: "रोटी या चावल?", es: "¿Pan o arroz?", fr: "Pain ou riz ?", mi: "Parāoa, raihi rānei?", zh: "面包还是米饭?", sm: "Falaoa po'o araisa?" } },
      { id: "q51", type: "question", minTier: 0, emoji: "🏊", title: "Swimming or running?", translations: { hi: "तैरना या दौड़ना?", es: "¿Nadar o correr?", fr: "Nager ou courir ?", mi: "Kauhoe, oma rānei?", zh: "游泳还是跑步?", sm: "Aau po'o tamo'e?" } },
      { id: "q52", type: "question", minTier: 1, emoji: "🎉", title: "Surprise party or quiet dinner?", translations: { hi: "सरप्राइज़ पार्टी या शांत रात का खाना?", es: "¿Fiesta sorpresa o cena tranquila?", fr: "Fête surprise ou dîner tranquille ?", mi: "Hākari ohorere, kai pō marie rānei?", zh: "惊喜派对还是安静的晚餐?", sm: "Pati faafuase'i po'o taumafataga filemu?" } },
      { id: "q53", type: "question", minTier: 1, emoji: "🏙️", title: "Big city or small town?", translations: { hi: "बड़ा शहर या छोटा कस्बा?", es: "¿Ciudad grande o pueblo pequeño?", fr: "Grande ville ou petite ville ?", mi: "Tāone nui, tāone iti rānei?", zh: "大城市还是小镇?", sm: "Aai tele po'o taulaga laiti?" } },
      { id: "q54", type: "question", minTier: 0, emoji: "🏝️", title: "Island holiday or mountain holiday?", translations: { hi: "द्वीप की छुट्टी या पहाड़ की छुट्टी?", es: "¿Vacaciones en una isla o en la montaña?", fr: "Vacances sur une île ou à la montagne ?", mi: "Hararei motu, hararei maunga rānei?", zh: "海岛度假还是山中度假?", sm: "Malologa i le motu po'o le mauga?" } },
      { id: "q55", type: "question", minTier: 0, emoji: "🐠", title: "A fish or a bird as a pet?", translations: { hi: "पालतू के रूप में मछली या चिड़िया?", es: "¿Un pez o un pájaro como mascota?", fr: "Un poisson ou un oiseau comme animal de compagnie ?", mi: "He ika, he manu rānei hei mōkai?", zh: "养鱼还是养鸟?", sm: "Se i'a po'o se manulele e fai ma fagafao?" } },
      { id: "q56", type: "question", minTier: 1, emoji: "⛰️", title: "Mountain climb or beach walk?", translations: { hi: "पहाड़ चढ़ना या समुद्र तट पर टहलना?", es: "¿Escalar una montaña o caminar por la playa?", fr: "Escalader une montagne ou marcher sur la plage ?", mi: "Piki maunga, hīkoi tahatai rānei?", zh: "爬山还是在沙滩上散步?", sm: "A'e i le mauga po'o savali i le matafaga?" } },
      { id: "q57", type: "question", minTier: 1, emoji: "🌤️", title: "Summer morning or winter evening?", translations: { hi: "गर्मी की सुबह या सर्दी की शाम?", es: "¿Una mañana de verano o una tarde de invierno?", fr: "Un matin d'été ou un soir d'hiver ?", mi: "Te ata raumati, te ahiahi hōtoke rānei?", zh: "夏天的早晨还是冬天的傍晚?", sm: "Taeao o le taumafanafana po'o le afiafi o le taumalulu?" } },
      { id: "q58", type: "question", minTier: 0, emoji: "🎨", title: "Painting or building with blocks?", translations: { hi: "पेंटिंग करना या ब्लॉक से बनाना?", es: "¿Pintar o construir con bloques?", fr: "Peindre ou construire avec des blocs ?", mi: "Peita, hanga poraka rānei?", zh: "画画还是用积木搭建?", sm: "Valiina po'o fau i poloka?" } },
      { id: "q59", type: "question", minTier: 0, emoji: "🥁", title: "Piano or drums?", translations: { hi: "पियानो या ढोल?", es: "¿Piano o tambor?", fr: "Piano ou tambour ?", mi: "Piana, pahū rānei?", zh: "钢琴还是鼓?", sm: "Piano po'o pate?" } },
      { id: "q60", type: "question", minTier: 0, emoji: "🌙", title: "Sun or moon?", translations: { hi: "सूरज या चाँद?", es: "¿Sol o luna?", fr: "Soleil ou lune ?", mi: "Te rā, te marama rānei?", zh: "太阳还是月亮?", sm: "Le la po'o le masina?" } },
      { id: "q61", type: "question", minTier: 2, emoji: "🧭", title: "Plan ahead or go with the flow?", translations: { hi: "पहले से योजना बनाना या हालात के साथ चलना?", es: "¿Planificar con tiempo o dejarse llevar?", fr: "Planifier à l'avance ou se laisser porter ?", mi: "Whakamahere i mua, tuku noa rānei?", zh: "提前计划还是顺其自然?", sm: "Fuafua muamua po'o tuu atu e alu ai?" } },
      { id: "q62", type: "question", minTier: 2, emoji: "🧠", title: "Learn something new or get better at something you know?", translations: { hi: "कुछ नया सीखना या जो आता है उसमें बेहतर होना?", es: "¿Aprender algo nuevo o mejorar en algo que ya sabes?", fr: "Apprendre quelque chose de nouveau ou t'améliorer dans ce que tu sais déjà ?", mi: "Ako i tētahi mea hou, whakapai ake rānei i tētahi mea e mōhio ana koe?", zh: "学新东西还是把已经会的做得更好?", sm: "Aoao se mea fou po'o faaleleia atili se mea ua e iloa?" } },
      { id: "q63", type: "question", minTier: 1, emoji: "🚶", title: "Lead the group or help the group?", translations: { hi: "समूह का नेतृत्व करना या समूह की मदद करना?", es: "¿Dirigir al grupo o ayudar al grupo?", fr: "Diriger le groupe ou aider le groupe ?", mi: "Hautū i te rōpū, āwhina i te rōpū rānei?", zh: "带领小组还是帮助小组?", sm: "Taitai le vaega po'o fesoasoani i le vaega?" } },
      { id: "q64", type: "question", minTier: 1, emoji: "📚", title: "Read a book or watch a film?", translations: { hi: "किताब पढ़ना या फ़िल्म देखना?", es: "¿Leer un libro o ver una película?", fr: "Lire un livre ou regarder un film ?", mi: "Pānui pukapuka, mātakitaki kiriata rānei?", zh: "读书还是看电影?", sm: "Faitau se tusi po'o matamata i se ata?" } },
      { id: "q65", type: "question", minTier: 0, emoji: "🏖️", title: "Beach or pool?", translations: { hi: "समुद्र तट या स्विमिंग पूल?", es: "¿Playa o piscina?", fr: "Plage ou piscine ?", mi: "Tahatai, puna kaukau rānei?", zh: "海滩还是游泳池?", sm: "Matafaga po'o vaita'ele?" } },
      { id: "qa1", type: "activity", minTier: 0, emoji: "👏", title: "Everyone clap once if you said yes to the last question, don't clap if you said no.", translations: { hi: "अगर आपने पिछले सवाल का जवाब हाँ में दिया तो एक बार ताली बजाएँ, अगर नहीं तो मत बजाएँ।", es: "Todos aplaudan una vez si dijeron sí a la última pregunta, no aplaudan si dijeron no.", fr: "Tout le monde applaudit une fois si vous avez répondu oui à la dernière question, n'applaudissez pas si non.", mi: "Pakipaki kotahi te katoa mehemea i kī 'āe' rātou ki te pātai o mua, kaua e pakipaki mehemea i kī 'kāo'.", zh: "如果你对上一个问题回答\u201c是\u201d,就拍一次手,如果回答\u201c否\u201d就不要拍手。", sm: "Tagata uma ia patipati faatasi pe a e tali ioe i le fesili talu ai, aua le patipati pe a e tali leai." } },
      { id: "qa2", type: "activity", minTier: 0, emoji: "🙏", title: "High five the person next to you.", translations: { hi: "अपने बगल वाले व्यक्ति को हाई-फाइव दें।", es: "Choca los cinco con la persona de al lado.", fr: "Tape dans la main de la personne à côté de toi.", mi: "Pāwhiri ringa ki te tangata kei tō taha.", zh: "和旁边的人击掌。", sm: "Tapa lima maualuga i le tagata o loo tu i ou tafatafa." } },
      { id: "qa3", type: "activity", minTier: 0, emoji: "🤸", title: "Everyone jump up and down three times.", translations: { hi: "सब लोग तीन बार ऊपर-नीचे कूदें।", es: "Todos salten hacia arriba y hacia abajo tres veces.", fr: "Tout le monde saute trois fois de haut en bas.", mi: "Peke ai te katoa ki runga, ki raro, e toru ngā wā.", zh: "大家上下跳三次。", sm: "Tagata uma ia osooso i luga ma lalo faatolu." } },
      { id: "qa4", type: "activity", minTier: 0, emoji: "😮", title: "Everyone make a surprised face for two seconds.", translations: { hi: "सब लोग दो सेकंड के लिए हैरान चेहरा बनाएँ।", es: "Todos hagan cara de sorpresa durante dos segundos.", fr: "Tout le monde fait une tête surprise pendant deux secondes.", mi: "Whakaahua ai te katoa i te mata ohorere mō ngā hēkona e rua.", zh: "大家做出惊讶的表情两秒钟。", sm: "Tagata uma ia faia se foliga te'i mo le lua sekone." } },
      { id: "qa5", type: "activity", minTier: 0, emoji: "🤲", title: "Everyone rub their hands together and say 'brrr' like it's freezing.", translations: { hi: "सब लोग अपने हाथ रगड़ें और ऐसे 'ब्र्र्र' कहें जैसे बहुत ठंड हो।", es: "Todos frótense las manos y digan 'brrr' como si hiciera mucho frío.", fr: "Tout le monde se frotte les mains et dit 'brrr' comme s'il faisait très froid.", mi: "Mirimiri ai te katoa i ō rātou ringa me te kī 'brrr' me te mea he makariri rawa.", zh: "大家搓搓手,说\u201cbrrr\u201d,好像很冷一样。", sm: "Tagata uma ia olo o latou lima faatasi ma fai atu 'brrr' e pei o loo malulu tele." } },
      { id: "q21", type: "question", minTier: 0, emoji: "🛝", title: "Slide or swing?", translations: { hi: "स्लाइड या झूला?", es: "¿Tobogán o columpio?", fr: "Toboggan ou balançoire ?", mi: "Rerenga, tāhūhū rānei?", zh: "滑梯还是秋千?", sm: "Se'eaga po'o le taavili?" } },
      { id: "q22", type: "question", minTier: 0, emoji: "⛈️", title: "Thunder or lightning?", translations: { hi: "गरज या बिजली?", es: "¿Trueno o relámpago?", fr: "Tonnerre ou éclair ?", mi: "Whatitiri, uira rānei?", zh: "打雷还是闪电?", sm: "Faititili po'o le uila?" } },
      { id: "q23", type: "question", minTier: 0, emoji: "🏊", title: "Trampoline or pool?", translations: { hi: "ट्रैम्पोलिन या पूल?", es: "¿Trampolín o piscina?", fr: "Trampoline ou piscine ?", mi: "Poroherehere, waikaukau rānei?", zh: "蹦床还是游泳池?", sm: "Ta'ega osooso po'o le vaitaele?" } },
      { id: "q24", type: "question", minTier: 1, emoji: "🚪", title: "Chased by a giant marshmallow! 🔴 Red = dark drop. 🔵 Blue = thick cake, can't see through. 🟡 Yellow = bouncy jelly room. 🟢 Green = quiet, smells like rain. Pick a door!", translations: { hi: "एक विशाल मार्शमैलो पीछा कर रहा है! 🔴 लाल = अंधेरे में गिरावट। 🔵 नीला = गाढ़ा केक, आर-पार नहीं दिखता। 🟡 पीला = उछलती जेली का कमरा। 🟢 हरा = शांत, बारिश जैसी खुशबू। एक दरवाज़ा चुनिए!", es: "¡Un malvavisco gigante te persigue! 🔴 Rojo = caída oscura. 🔵 Azul = pastel espeso, no se ve a través. 🟡 Amarillo = sala de gelatina que rebota. 🟢 Verde = tranquilo, huele a lluvia. ¡Elige una puerta!", fr: "Poursuivi par une guimauve géante ! 🔴 Rouge = chute sombre. 🔵 Bleu = gâteau épais, on ne voit pas à travers. 🟡 Jaune = pièce de gelée qui rebondit. 🟢 Vert = calme, sent la pluie. Choisis une porte !", mi: "Kei te whaia koe e tētahi mātimati nui! 🔴 Whero = hekenga pōuri. 🔵 Kikorangi = keke mātotoru, kāore e kitea. 🟡 Kōwhai = rūma tia peke. 🟢 Kākāriki = ata noho, rite ki te haunga ua. Kōwhiria he kūaha!", zh: "被巨大的棉花糖追赶!🔴 红色 = 黑暗坠落。🔵 蓝色 = 厚蛋糕,看不透。🟡 黄色 = 弹跳果冻房。🟢 绿色 = 安静,闻起来像雨。选一扇门!", sm: "O lo'o tuliloaina e se mariuma tele! 🔴 Mumu = paʻu pouli. 🔵 Lanumoana = keke ma'ai, le mafai ona vaai i totonu. 🟡 Samasama = potu sela osooso. 🟢 Lanumeamata = filemu, manogi e pei o le timu. Filifili se faitotoa!" } },
      { id: "q25", type: "question", minTier: 1, emoji: "🫧", title: "Escape room, four buttons! 🔴 Red = ceiling opens, long drop. 🔵 Blue = flooded with custard. 🟡 Yellow = huge pop, bubbles gone. 🟢 Green = bubbles become balloons. Pick a button!", translations: { hi: "एस्केप रूम, चार बटन! 🔴 लाल = छत खुलती है, लंबी गिरावट। 🔵 नीला = कस्टर्ड से भर जाता है। 🟡 पीला = ज़ोरदार धमाका, बुलबुले गायब। 🟢 हरा = बुलबुले गुब्बारे बन जाते हैं। एक बटन चुनिए!", es: "¡Sala de escape, cuatro botones! 🔴 Rojo = el techo se abre, caída larga. 🔵 Azul = inundado con natillas. 🟡 Amarillo = gran estallido, burbujas desaparecen. 🟢 Verde = las burbujas se vuelven globos. ¡Elige un botón!", fr: "Escape room, quatre boutons ! 🔴 Rouge = le plafond s'ouvre, longue chute. 🔵 Bleu = inondé de crème pâtissière. 🟡 Jaune = grosse explosion, bulles disparues. 🟢 Vert = les bulles deviennent des ballons. Choisis un bouton !", mi: "Rūma mawhiti, e whā ngā pātene! 🔴 Whero = tuwhera te tuanui, hekenga roa. 🔵 Kikorangi = waipuke ki te kirīmi. 🟡 Kōwhai = pahū nui, ngaro ngā mirumiru. 🟢 Kākāriki = huri ngā mirumiru hei poihau. Kōwhiria he pātene!", zh: "密室逃脱,四个按钮!🔴 红色 = 天花板打开,长长的坠落。🔵 蓝色 = 灌满蛋奶糊。🟡 黄色 = 巨大的爆裂声,泡泡消失。🟢 绿色 = 泡泡变成气球。选一个按钮!", sm: "Potu sola, pusi e fa! 🔴 Mumu = tatala le faaluga, paʻu umi. 🔵 Lanumoana = lolovaia i le kasata. 🟡 Samasama = pa tele, mou pulu. 🟢 Lanumeamata = liua pulu i pa'u. Filifili se pusi!" } },
      { id: "q26", type: "question", minTier: 0, emoji: "👡", title: "Slippers or bare feet?", translations: { hi: "चप्पल या नंगे पैर?", es: "¿Pantuflas o pies descalzos?", fr: "Pantoufles ou pieds nus ?", mi: "Hū kāinga, waewae kau rānei?", zh: "拖鞋还是光脚？", sm: "Seevae fale po'o vae li'o?" } },
      { id: "q27", type: "question", minTier: 0, emoji: "🧩", title: "Puzzle or colouring in?", translations: { hi: "पहेली या रंग भरना?", es: "¿Rompecabezas o colorear?", fr: "Puzzle ou coloriage ?", mi: "Panga, tā tae rānei?", zh: "拼图还是涂色？", sm: "Pusela po'o valivali?" } },
      { id: "q28", type: "question", minTier: 0, emoji: "🙈", title: "Hide and seek or tag?", translations: { hi: "लुका-छिपी या टैग?", es: "¿Escondite o pilla-pilla?", fr: "Cache-cache ou chat perché ?", mi: "Piri, whakaki rānei?", zh: "捉迷藏还是抓人游戏？", sm: "Lafi po'o le tapo?" } },
      { id: "q29", type: "question", minTier: 0, emoji: "🎒", title: "Backpack or bag?", translations: { hi: "बैकपैक या बैग?", es: "¿Mochila o bolso?", fr: "Sac à dos ou sac ?", mi: "Pēke tuarā, pēke rānei?", zh: "背包还是手提包？", sm: "Ato tua po'o le ato?" } },
      { id: "q30", type: "question", minTier: 0, emoji: "🔔", title: "Whistle or bell?", translations: { hi: "सीटी या घंटी?", es: "¿Silbato o campana?", fr: "Sifflet ou cloche ?", mi: "Whio, pere rānei?", zh: "口哨还是铃铛？", sm: "Fagufagu po'o le logo?" } },
      { id: "q31", type: "question", minTier: 0, emoji: "🦁", title: "Museum or zoo?", translations: { hi: "संग्रहालय या चिड़ियाघर?", es: "¿Museo o zoológico?", fr: "Musée ou zoo ?", mi: "Whare taonga, kāri kararehe rānei?", zh: "博物馆还是动物园？", sm: "Falemataaga po'o le fale manu?" } },
      { id: "q32", type: "question", minTier: 0, emoji: "🍎", title: "Recess or lunchtime?", translations: { hi: "रिसेस या लंच टाइम?", es: "¿Recreo o hora del almuerzo?", fr: "Récréation ou heure du déjeuner ?", mi: "Wā okioki, wā tina rānei?", zh: "课间还是午餐时间？", sm: "Taimi malolo po'o le taimi o le taumafataga?" } },
      { id: "q33", type: "question", minTier: 0, emoji: "👥", title: "Group work or working alone?", translations: { hi: "समूह में काम या अकेले काम?", es: "¿Trabajo en grupo o trabajar solo?", fr: "Travail en groupe ou travailler seul ?", mi: "Mahi rōpū, mahi takitahi rānei?", zh: "小组作业还是独自完成？", sm: "Galuega faavasega po'o le galue toatasi?" } },
      { id: "q34", type: "question", minTier: 0, emoji: "📚", title: "Story time or free play?", translations: { hi: "कहानी का समय या फ्री प्ले?", es: "¿Hora del cuento o juego libre?", fr: "Heure du conte ou jeu libre ?", mi: "Wā kōrero, tākaro noa rānei?", zh: "故事时间还是自由玩耍？", sm: "Taimi tala po'o le taaalo saoloto?" } },
      { id: "q35", type: "question", minTier: 0, emoji: "☕", title: "Warm drink or cold drink?", translations: { hi: "गर्म पेय या ठंडा पेय?", es: "¿Bebida caliente o bebida fría?", fr: "Boisson chaude ou boisson froide ?", mi: "Inu mahana, inu mātao rānei?", zh: "热饮还是冷饮？", sm: "Vaiinu mafanafana po'o vaiinu malulu?" } },
    ],
  },
];

const AGE_GROUPS = {
  y1_2: { label: "Years 1/2", short: "Y1-2", tierIndex: 0 },
  y3_4: { label: "Years 3/4", short: "Y3-4", tierIndex: 1 },
  y5_6: { label: "Years 5/6", short: "Y5-6", tierIndex: 2 },
  y7_8: { label: "Years 7/8", short: "Y7-8", tierIndex: 3 },
};

function getCardsForAge(category, ageGroup) {
  const tierIndex = AGE_GROUPS[ageGroup].tierIndex;
  return category.cards.filter((c) => c.minTier <= tierIndex);
}

function getCardText(card, lang, ageGroup) {
  if (ageGroup === "y1_2" && lang === "en" && card.simple) return card.simple;
  return lang === "en" ? card.title : card.translations[lang];
}

function getCategoryDesc(category, lang) {
  return lang === "en" ? category.description : category.descTranslations[lang];
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ---------------------------- Shared bits ---------------------------- */

function ClockLogo() {
  return (
    <div className="clock-logo">
      <div className="clock-face">
        <div className="sand-fill" />
        <div className="clock-hand hour" />
        <div className="clock-hand minute" />
      </div>
    </div>
  );
}

function Logo({ onClick }) {
  return (
    <div className="brand" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}>
      <ClockLogo />
      <span className="brand-text">Time<span>fillers</span></span>
    </div>
  );
}

function LanguageSelector({ primaryLanguage, setPrimaryLanguage, secondaryLanguage, setSecondaryLanguage }) {
  const [openWhich, setOpenWhich] = useState(null); // 'primary' | 'secondary' | null

  return (
    <div className="lang-selector">
      <div className="lang-selector-group">
        <button className="lang-btn" onClick={() => setOpenWhich((w) => (w === "primary" ? null : "primary"))}>
          🌐 Primary <span className="lang-current">{LANGS[primaryLanguage].flag}</span>
        </button>
        {openWhich === "primary" && (
          <div className="lang-menu">
            {Object.entries(LANGS).map(([code, meta]) => (
              <button
                key={code}
                className={`lang-option ${primaryLanguage === code ? "active" : ""}`}
                onClick={() => { setPrimaryLanguage(code); setOpenWhich(null); }}
              >
                {meta.flag} {meta.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lang-selector-group">
        <button className="lang-btn" onClick={() => setOpenWhich((w) => (w === "secondary" ? null : "secondary"))}>
          🌐 Secondary <span className="lang-current">{LANGS[secondaryLanguage].flag}</span>
        </button>
        {openWhich === "secondary" && (
          <div className="lang-menu">
            {Object.entries(LANGS).map(([code, meta]) => (
              <button
                key={code}
                className={`lang-option ${secondaryLanguage === code ? "active" : ""}`}
                onClick={() => { setSecondaryLanguage(code); setOpenWhich(null); }}
              >
                {meta.flag} {meta.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RandomSelectToggle({ enabled, setEnabled }) {
  return (
    <button
      className={`random-toggle ${enabled ? "on" : ""}`}
      onClick={() => setEnabled((e) => !e)}
      aria-pressed={enabled}
    >
      <span className="random-toggle-dot" />
      🎲 Random Select
    </button>
  );
}

function AgeGroupSelector({ ageGroup, setAgeGroup }) {
  return (
    <div className="age-selector" role="group" aria-label="Year level">
      {Object.entries(AGE_GROUPS).map(([code, meta]) => (
        <button
          key={code}
          className={`age-option ${ageGroup === code ? "active" : ""}`}
          onClick={() => setAgeGroup(code)}
          aria-pressed={ageGroup === code}
        >
          {meta.short}
        </button>
      ))}
    </div>
  );
}

function RandomSelectPanel({ onClose }) {
  const [criterion, setCriterion] = useState(() => shuffle(RANDOM_CRITERIA)[0]);

  function pickAgain() {
    setCriterion((prev) => {
      let next = prev;
      while (next === prev) {
        next = RANDOM_CRITERIA[Math.floor(Math.random() * RANDOM_CRITERIA.length)];
      }
      return next;
    });
  }

  return (
    <div className="random-panel">
      <div className="random-panel-label">🎯 Answer this one:</div>
      <div className="random-panel-criterion">{criterion}</div>
      <div className="random-panel-buttons">
        <button className="btn btn-secondary" onClick={pickAgain}>🔄 Pick Again</button>
        <button className="btn btn-primary" onClick={onClose}>✓ Done</button>
      </div>
    </div>
  );
}

/* ---------------------------- Autopilot ---------------------------- */

const AUTOPILOT_DURATIONS = [
  { seconds: 30, label: "0:30" },
  { seconds: 60, label: "1:00" },
  { seconds: 90, label: "1:30" },
  { seconds: 180, label: "3:00" },
];

const STUDENT_COUNT_OPTIONS = [1, 2, 3, 4];

// Quick challenges: the first student to do the thing gets to share.
// "{L}" is replaced with a random letter each time.
const CHALLENGE_LETTERS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "W"];
const AUTOPILOT_CHALLENGES = [
  "✋ The first student to put their hand up (quietly!)",
  "🔤 The first student to say a word starting with “{L}”",
  "🐾 The first student to name an animal starting with “{L}”",
  "🍎 The first student to name a fruit or vegetable",
  "🌍 The first student to name a country",
  "🏙️ The first student to name a place in New Zealand",
  "🎨 The first student to name something that is blue",
  "🔢 The first student to say a number between 20 and 100",
  "🧍 The first student to stand up silently",
  "👋 The first student to say hello in another language",
  "🍽️ The first student to name a food starting with “{L}”",
  "🎵 The first student to name a song or a singer",
  "🦵 The first student to stand on one leg",
  "👏 The first student to clap three times, quietly",
  "🧠 The first student to say a word that rhymes with “cat”",
  "📚 The first student to name a book or a story character",
];

// Builds the (hidden) list of who will share for one card.
function pickSpeakers(count, mode) {
  const pickChallenges = (n) =>
    shuffle(AUTOPILOT_CHALLENGES).slice(0, n).map((c) => c.replace("{L}", () => shuffle(CHALLENGE_LETTERS)[0]));
  const crit = shuffle(RANDOM_CRITERIA);
  const chal = pickChallenges(count);
  if (mode === "challenge") return chal;
  if (mode === "criteria") return crit.slice(0, count);
  // mix: alternate randomly between the two
  const out = [];
  let ci = 0, hi = 0;
  const startWithChallenge = Math.random() < 0.5;
  for (let k = 0; k < count; k++) {
    const useChal = (k % 2 === 0) === startWithChallenge;
    out.push(useChal ? chal[hi++] : crit[ci++]);
  }
  return out;
}

const SHARE_DURATION_OPTIONS = [
  { seconds: 15, label: "0:15" },
  { seconds: 30, label: "0:30" },
  { seconds: 45, label: "0:45" },
  { seconds: 60, label: "1:00" },
];

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function AutopilotToggle({ onClick }) {
  return (
    <button className="autopilot-toggle" onClick={onClick}>
      🚀 Autopilot
    </button>
  );
}

function AutopilotSettingsModal({ settings, setSettings, onStart, onClose }) {
  return (
    <div className="modal-overlay open">
      <div className="modal autopilot-modal">
        <h2 className="modal-title">🚀 Autopilot Mode</h2>
        <p className="onboarding-body">
          Runs the category hands-free on the big screen. It always picks a random way to choose who
          answers, times the discussion, then gives students a turn to share.
        </p>

        <div className="autopilot-field">
          <div className="autopilot-field-label">Card order</div>
          <div className="age-selector" style={{ width: "100%" }}>
            <button
              className={`age-option ${settings.order === "sequential" ? "active" : ""}`}
              style={{ flex: 1 }}
              onClick={() => setSettings((s) => ({ ...s, order: "sequential" }))}
            >
              In order
            </button>
            <button
              className={`age-option ${settings.order === "random" ? "active" : ""}`}
              style={{ flex: 1 }}
              onClick={() => setSettings((s) => ({ ...s, order: "random" }))}
            >
              Random
            </button>
          </div>
        </div>

        <div className="autopilot-field">
          <div className="autopilot-field-label">⏱️ Discussion time per card</div>
          <div className="age-selector" style={{ width: "100%" }}>
            {AUTOPILOT_DURATIONS.map((d) => (
              <button
                key={d.seconds}
                className={`age-option ${settings.duration === d.seconds ? "active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setSettings((s) => ({ ...s, duration: d.seconds }))}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="autopilot-field">
          <div className="autopilot-field-label">🎯 How is the student chosen?</div>
          <div className="age-selector" style={{ width: "100%" }}>
            {[["mix", "🎲 Mix"], ["criteria", "👤 Random student"], ["challenge", "⚡ Quick challenge"]].map(([val, label]) => (
              <button
                key={val}
                className={`age-option ${settings.whoMode === val ? "active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setSettings((st) => ({ ...st, whoMode: val }))}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="onboarding-body" style={{ fontSize: 13, margin: "6px 0 0" }}>
            {settings.whoMode === "challenge"
              ? "Quick challenges: the first student to do it shares, e.g. “first to put their hand up” or “first to say a word starting with B”."
              : settings.whoMode === "criteria"
              ? "A random description picks the student, e.g. “the student with the longest hair”."
              : "Mixes random descriptions with quick challenges."}
          </p>
        </div>

        <div className="autopilot-field">
          <div className="autopilot-field-label">🙋 Students chosen per question</div>
          <div className="age-selector" style={{ width: "100%" }}>
            {STUDENT_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                className={`age-option ${settings.studentsPerQuestion === n ? "active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setSettings((s) => ({ ...s, studentsPerQuestion: n }))}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="autopilot-field">
          <div className="autopilot-field-label">🎤 Sharing time per student</div>
          <div className="age-selector" style={{ width: "100%" }}>
            {SHARE_DURATION_OPTIONS.map((d) => (
              <button
                key={d.seconds}
                className={`age-option ${settings.shareDuration === d.seconds ? "active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setSettings((s) => ({ ...s, shareDuration: d.seconds }))}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <p className="autopilot-summary">
          Each card: {formatTime(settings.duration)} to discuss, then {settings.studentsPerQuestion}{" "}
          {settings.studentsPerQuestion === 1 ? "student shares" : "students share in turn"}, {formatTime(settings.shareDuration)} each.
        </p>

        <div className="onboarding-buttons">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onStart}>▶ Start</button>
        </div>
      </div>
    </div>
  );
}

function AutopilotRunner({ deck, startIndex, settings, primaryLanguage, secondaryLanguage, ageGroup, onExit }) {
  const [order] = useState(() => (settings.order === "random" ? shuffle(deck) : deck));
  const [index, setIndex] = useState(() => (settings.order === "random" ? 0 : Math.min(startIndex || 0, deck.length - 1)));
  const [phase, setPhase] = useState("discuss"); // 'discuss' | 'share'
  const [timeLeft, setTimeLeft] = useState(settings.duration);
  const [paused, setPaused] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState(() => pickSpeakers(settings.studentsPerQuestion, settings.whoMode));
  const [studentIndex, setStudentIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showRevealPopup, setShowRevealPopup] = useState(false);
  const [showQuietReminder, setShowQuietReminder] = useState(false);

  const total = order.length;
  const current = order[index];
  const isActivity = current && current.type === "activity";
  const currentStudentCriterion = selectedCriteria[studentIndex];

  // Set up a fresh card: new hidden student list, reset phase & timer, play "choosing" sound
  useEffect(() => {
    if (finished) return;
    setSelectedCriteria(pickSpeakers(settings.studentsPerQuestion, settings.whoMode));
    setStudentIndex(0);
    setPhase("discuss");
    setTimeLeft(settings.duration);
    setAnimKey((k) => k + 1);
    setShowRevealPopup(false);
    setShowQuietReminder(false);
    if (!isActivity) playChooseSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function revealNextStudent(nextIndex) {
    playQuietChime();
    setStudentIndex(nextIndex);
    setPhase("share");
    setTimeLeft(settings.shareDuration);
    setShowRevealPopup(true);
    setTimeout(() => setShowRevealPopup(false), 4500);
  }

  // Manual overrides — the teacher can still skip forward/back or jump to a
  // random card at any time, even while Autopilot is running the timers.
  function manualNext() {
    if (index >= total - 1) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  function manualBack() {
    if (index === 0) return;
    setIndex((i) => i - 1);
  }

  function manualShuffleTo() {
    if (total <= 1) return;
    setIndex((i) => {
      let next = i;
      while (next === i) next = Math.floor(Math.random() * total);
      return next;
    });
  }

  // Countdown ticking
  useEffect(() => {
    if (paused || finished) return;

    if (timeLeft <= 0) {
      if (phase === "discuss" && !isActivity) {
        playTimerEndSound();
        const t = setTimeout(() => revealNextStudent(0), 400);
        return () => clearTimeout(t);
      } else if (phase === "share" && studentIndex < selectedCriteria.length - 1) {
        playShareEndDing();
        const t = setTimeout(() => revealNextStudent(studentIndex + 1), 400);
        return () => clearTimeout(t);
      } else {
        playShareEndDing();
        if (index >= total - 1) {
          setFinished(true);
        } else {
          setIndex((i) => i + 1);
        }
      }
      return;
    }

    // Mid-share reminder to stay quiet, once past the halfway point of this student's turn
    const reminderAt = Math.floor(settings.shareDuration / 2);
    if (phase === "share" && timeLeft === reminderAt && settings.shareDuration >= 20) {
      playQuietChime();
      setShowQuietReminder(true);
      setTimeout(() => setShowQuietReminder(false), 2200);
    }

    const t = setTimeout(() => setTimeLeft((tl) => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, paused, phase, finished]);

  if (finished) {
    return (
      <div className="game-card completion">
        <div className="confetti">🚀</div>
        <h1 className="title-en">Autopilot complete!</h1>
        <button className="btn btn-primary home-link-btn" onClick={onExit}>⏹ Exit Autopilot</button>
      </div>
    );
  }

  return (
    <div className="autopilot-runner">
      <div className="progress" aria-live="polite">Card {index + 1} / {total}</div>

      <Card card={current} animKey={animKey} primaryLanguage={primaryLanguage} secondaryLanguage={secondaryLanguage} ageGroup={ageGroup} />

      {isActivity ? (
        <div className="turn-badge everyone">🌟 Everyone!</div>
      ) : phase === "discuss" ? (
        <div className="turn-badge">🤔 Think it over — the {selectedCriteria.length > 1 ? "students are" : "student is"} a secret for now!</div>
      ) : (
        <div className="turn-badge sharing turn-badge-big">
          🎤 {currentStudentCriterion}
          {selectedCriteria.length > 1 && (
            <span className="turn-badge-count"> · {studentIndex + 1} of {selectedCriteria.length}</span>
          )}
        </div>
      )}

      <div className="autopilot-timer">
        <div className="autopilot-timer-label">
          {phase === "discuss" ? "💭 Think & Discuss" : "🎤 Sharing Time"}
        </div>
        <div className="autopilot-timer-clock">{formatTime(timeLeft)}</div>
      </div>

      <div className="autopilot-manual-row">
        <button className="autopilot-nav-btn" onClick={manualBack} disabled={index === 0} aria-label="Previous card">
          ⏮ Back
        </button>
        <button className="autopilot-nav-btn" onClick={manualShuffleTo} aria-label="Jump to a random card">
          🔀 Shuffle
        </button>
        <button className="autopilot-nav-btn" onClick={manualNext} aria-label="Next card">
          Next ⏭
        </button>
      </div>

      <div className="autopilot-controls">
        <button className="btn btn-secondary" onClick={() => setPaused((p) => !p)}>
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button className="btn btn-secondary" onClick={onExit}>⏹ Exit Autopilot</button>
      </div>

      {showRevealPopup && !isActivity && (
        <div className="reveal-popup-overlay">
          <div className="reveal-popup">
            <div className="reveal-popup-kicker">
              🎤 Sharing Time!{selectedCriteria.length > 1 ? ` (${studentIndex + 1} of ${selectedCriteria.length})` : ""}
            </div>
            <div className="reveal-popup-name">{currentStudentCriterion}</div>
            <div className="reveal-popup-quiet">🤫 Everyone else — quiet and listening!</div>
          </div>
        </div>
      )}

      {showQuietReminder && (
        <div className="quiet-reminder-overlay">
          <div className="quiet-reminder">🤫 Shh! Still sharing time...</div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Home screen ---------------------------- */

function CategoryCard({ category, primaryLanguage, secondaryLanguage, onSelect }) {
  const primaryDesc = getCategoryDesc(category, primaryLanguage);
  const secondaryDesc = secondaryLanguage !== primaryLanguage ? getCategoryDesc(category, secondaryLanguage) : null;
  return (
    <button className="category-card" onClick={() => onSelect(category)}>
      <div className="category-blob"><span>{category.emoji}</span></div>
      <h3 className="category-title">{category.title}</h3>
      <p className="category-desc">{primaryDesc}</p>
      {secondaryDesc && <p className="category-desc-translated">{secondaryDesc}</p>}
    </button>
  );
}

function HomeScreen({ primaryLanguage, secondaryLanguage, ageGroup, setAgeGroup, randomSelectEnabled, setRandomSelectEnabled, onSelectCategory, onOpenReo, onOpenTutor }) {
  return (
    <div className="home-screen">
      <div className="home-hero">
        <Logo onClick={() => {}} />
        <p className="home-tagline">Pick a category and get the class thinking.</p>
      </div>

      <div className="category-grid">
        {CATEGORIES.map((cat) => (
          <CategoryCard key={cat.id} category={cat} primaryLanguage={primaryLanguage} secondaryLanguage={secondaryLanguage} onSelect={onSelectCategory} />
        ))}
      </div>

      <button className="reo-launch-btn" onClick={onOpenReo}>
        <span className="reo-launch-emoji">🗣️</span>
        <span className="reo-launch-text">
          <span className="reo-launch-title">Reo Practice — Kōrero Reo</span>
          <span className="reo-launch-desc">Sentence starters, finishers & a drag-and-drop builder, with picture prompts. Starter to Fluent.</span>
        </span>
      </button>

      <button className="reo-launch-btn tutor-launch-btn" onClick={onOpenTutor}>
        <span className="reo-launch-emoji">🎓</span>
        <span className="reo-launch-text">
          <span className="reo-launch-title"><span className="bi"><span className="bi-en">Tutor Zone — Language Learning</span><span className="bi-es">Zona de Tutoría — Aprendizaje de idiomas</span></span></span>
          <span className="reo-launch-desc"><span className="bi"><span className="bi-en">Colombian Spanish practice: 5 topics, A1–B2.</span><span className="bi-es">Práctica de español de Colombia: 5 temas, A1–B2.</span></span></span>
        </span>
      </button>

      <div className="home-random-row">
        <AgeGroupSelector ageGroup={ageGroup} setAgeGroup={setAgeGroup} />
        <RandomSelectToggle enabled={randomSelectEnabled} setEnabled={setRandomSelectEnabled} />
      </div>
    </div>
  );
}

/* ---------------------------- Game screen ---------------------------- */

function Card({ card, animKey, primaryLanguage, secondaryLanguage, ageGroup }) {
  const isActivity = card.type === "activity";
  const accent = isActivity ? "var(--a)" : "var(--q)";
  const primaryText = getCardText(card, primaryLanguage, ageGroup);
  const secondaryText = secondaryLanguage !== primaryLanguage ? getCardText(card, secondaryLanguage, ageGroup) : null;

  return (
    <div key={animKey} className="game-card">
      <span className="card-kind" style={{ color: accent, background: isActivity ? "var(--awash)" : "var(--qwash)" }}>
        {isActivity ? "🎲 Do this" : "💬 Talk about it"}
      </span>

      <div className="blob" style={{
        background: isActivity
          ? "linear-gradient(135deg, #DFF6F2 0%, #C9F0E9 100%)"
          : "linear-gradient(135deg, #FFE7E1 0%, #FFD9CF 100%)",
      }}>
        <span className="blob-emoji">{card.emoji}</span>
      </div>

      <h1 className="title-en">{primaryText}</h1>
      {secondaryText && <h2 className="title-hi">{secondaryText}</h2>}
    </div>
  );
}

function CompletionScreen({ onRestart, onShuffle, onHome }) {
  return (
    <div className="game-card completion">
      <div className="confetti">⏳</div>
      <h1 className="title-en">Time's up for this category!</h1>
      <div className="completion-buttons">
        <button className="btn btn-secondary" onClick={onRestart}>↺ Restart</button>
        <button className="btn btn-primary" onClick={onShuffle}>🔀 Shuffle Again</button>
      </div>
      <button className="btn btn-secondary home-link-btn" onClick={onHome}>🏠 Back to Categories</button>
    </div>
  );
}
function GameScreen({ category, primaryLanguage, secondaryLanguage, ageGroup, randomSelectEnabled, onHome }) {
  const [deck, setDeck] = useState(() => shuffle(getCardsForAge(category, ageGroup)));
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [showRandomPanel, setShowRandomPanel] = useState(false);
  const [showAutopilotSettings, setShowAutopilotSettings] = useState(false);
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [autopilotSettings, setAutopilotSettings] = useState({ order: "sequential", duration: 60, studentsPerQuestion: 1, shareDuration: 30, whoMode: "mix" });

  const total = deck.length;
  const current = deck[index];

  // Re-filter and reshuffle whenever the age group changes mid-session
  useEffect(() => {
    setDeck(shuffle(getCardsForAge(category, ageGroup)));
    setIndex(0);
    setDone(false);
    setAnimKey((k) => k + 1);
    setShowRandomPanel(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageGroup]);

  const advanceCard = useCallback(() => {
    setAnimKey((k) => k + 1);
    setShowRandomPanel(false);
    if (index >= total - 1) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, total]);

  const goBack = useCallback(() => {
    if (done) {
      setDone(false);
      setAnimKey((k) => k + 1);
      return;
    }
    if (index === 0) return;
    setAnimKey((k) => k + 1);
    setShowRandomPanel(false);
    setIndex((i) => Math.max(0, i - 1));
  }, [done, index]);

  const restart = useCallback(() => {
    setIndex(0);
    setDone(false);
    setAnimKey((k) => k + 1);
  }, []);

  const shuffleAgain = useCallback(() => {
    setDeck(shuffle(getCardsForAge(category, ageGroup)));
    setIndex(0);
    setDone(false);
    setAnimKey((k) => k + 1);
  }, [category, ageGroup]);

  const jumpToRandomCard = useCallback(() => {
    setAnimKey((k) => k + 1);
    setShowRandomPanel(false);
    setIndex((i) => {
      if (total <= 1) return i;
      let next = i;
      while (next === i) {
        next = Math.floor(Math.random() * total);
      }
      return next;
    });
  }, [total]);

  useEffect(() => {
    function handleKey(e) {
      if (autopilotRunning) return;
      if (e.code === "ArrowRight" || e.code === "Space") {
        e.preventDefault();
        if (!done) advanceCard();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [advanceCard, goBack, done, autopilotRunning]);

  return (
    <div className="game-screen">
      {autopilotRunning ? (
        <AutopilotRunner
          deck={deck}
          startIndex={index}
          settings={autopilotSettings}
          primaryLanguage={primaryLanguage}
          secondaryLanguage={secondaryLanguage}
          ageGroup={ageGroup}
          onExit={() => setAutopilotRunning(false)}
        />
      ) : done ? (
        <CompletionScreen onRestart={restart} onShuffle={shuffleAgain} onHome={onHome} />
      ) : (
        <>
          <Card card={current} animKey={animKey} primaryLanguage={primaryLanguage} secondaryLanguage={secondaryLanguage} ageGroup={ageGroup} />

          {randomSelectEnabled && !showRandomPanel && (
            <button className="btn btn-secondary pick-student-btn" onClick={() => setShowRandomPanel(true)}>
              🎯 Pick a Student
            </button>
          )}
          {randomSelectEnabled && showRandomPanel && (
            <RandomSelectPanel onClose={() => setShowRandomPanel(false)} />
          )}
        </>
      )}

      {!autopilotRunning && !done && (
        <div className="nav-bar">
          <button className="btn btn-secondary" onClick={goBack} disabled={index === 0} aria-label="Previous">
            ← Back
          </button>
          <div className="progress" aria-live="polite">Card {index + 1} / {total}</div>
          <button className="btn btn-primary" onClick={advanceCard} aria-label="Next">Next →</button>
        </div>
      )}

      {!autopilotRunning && !done && (
        <div className="shuffle-row">
          <button className="btn btn-secondary shuffle-btn" onClick={jumpToRandomCard} aria-label="Shuffle to a random card">
            🔀 Shuffle
          </button>
          <AutopilotToggle onClick={() => setShowAutopilotSettings(true)} />
        </div>
      )}

      {showAutopilotSettings && (
        <AutopilotSettingsModal
          settings={autopilotSettings}
          setSettings={setAutopilotSettings}
          onClose={() => setShowAutopilotSettings(false)}
          onStart={() => {
            setShowAutopilotSettings(false);
            setAutopilotRunning(true);
          }}
        />
      )}

      {!autopilotRunning && <div className="hint">Use ← → or Space to move between cards</div>}
    </div>
  );
}

/* ---------------------------- Onboarding ---------------------------- */

const ONBOARDING_STEPS = [
  { emoji: "⏳", title: "Welcome to Timefillers!", body: "A collection of fun thinking prompts for the classroom \u2014 perfect for spare minutes, transitions, or just mixing things up." },
  { emoji: "🗂️", title: "Pick a category", body: "Choose from Weird & Wonderful, Would You Rather, Imagine If..., or Super Quick to start a set of cards." },
  { emoji: "➡️", title: "Move through cards", body: "Use the Back and Next buttons, or the arrow keys / spacebar on your keyboard, to move through the cards." },
  { emoji: "🎯", title: "Random Select", body: "Turn on Random Select to have the app choose a fun way to pick who answers \u2014 like \u2018the student with the longest hair\u2019." },
  { emoji: "🌐", title: "Primary & Secondary language", body: "Set a Primary language for the main text, and a Secondary language for the translation shown underneath \u2014 great for language learners." },
];

function OnboardingModal({ primaryLanguage, setPrimaryLanguage, onClose }) {
  const [step, setStep] = useState(-1); // -1 = language picker, 0+ = tutorial steps
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const current = step >= 0 ? ONBOARDING_STEPS[step] : null;

  if (step === -1) {
    return (
      <div className="modal-overlay open">
        <div className="modal onboarding-modal">
          <div className="onboarding-blob"><span>🌐</span></div>
          <h2 className="modal-title">Choose your language</h2>
          <p className="onboarding-body">Select the language you'd like to use. You can change this anytime.</p>

          <div className="onboarding-lang-grid">
            {Object.entries(LANGS).map(([code, meta]) => (
              <button
                key={code}
                className={`onboarding-lang-option ${primaryLanguage === code ? "active" : ""}`}
                onClick={() => setPrimaryLanguage(code)}
              >
                <span className="onboarding-lang-flag">{meta.flag}</span>
                <span>{meta.label}</span>
              </button>
            ))}
          </div>

          <div className="onboarding-buttons">
            <button className="btn btn-secondary" onClick={onClose}>Skip</button>
            <button className="btn btn-primary" onClick={() => setStep(0)}>Continue →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay open">
      <div className="modal onboarding-modal">
        <div className="onboarding-blob"><span>{current.emoji}</span></div>
        <h2 className="modal-title">{current.title}</h2>
        <p className="onboarding-body">{current.body}</p>

        <div className="onboarding-dots">
          {ONBOARDING_STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? "active" : ""}`} />
          ))}
        </div>

        <div className="onboarding-buttons">
          <button className="btn btn-secondary" onClick={onClose}>Skip</button>
          {isLast ? (
            <button className="btn btn-primary" onClick={onClose}>Let's start! 🎉</button>
          ) : (
            <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Root app ---------------------------- */

export default function App() {
  const [screen, setScreen] = useState("home");
  const [category, setCategory] = useState(null);
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [secondaryLanguage, setSecondaryLanguage] = useState("mi");
  const [ageGroup, setAgeGroup] = useState("y5_6");
  const [randomSelectEnabled, setRandomSelectEnabled] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [theme, setTheme] = useState("sunny");

  function selectCategory(cat) {
    setCategory(cat);
    setScreen("game");
  }

  function goHome() {
    setScreen("home");
    setCategory(null);
  }

  function openTutor() {
    setScreen("tutor");
    setCategory(null);
  }

  function openReo() {
    setScreen("reo");
    setCategory(null);
  }

  return (
    <div className={`app-root age-${ageGroup.replace("_", "-")} theme-${theme}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@400;600;700;800&display=swap');
        .app-root {
          --bg:#FFF7ED; --bg2:#FFF1E4; --card:#FFFFFF; --ink:#2B2621; --ink2:#4A4339; --muted:#9C9284; --faint:#B0A695; --faint2:#C2B8A8;
          --line:#EFE6DA; --line2:#D9CCB9; --q:#FF6B57; --q-rgb:255,107,87; --qwash:#FFE7E1; --qwash2:#FFD9CF; --qsoft:#FFB9AC; --qdark:#C1442C;
          --a:#2BB3A3; --awash:#DFF6F2; --awash2:#C9F0E9; --adark:#1F6E63; --amid:#1F8A7E; --sand:#E8A94E; --sandline:#C2A876;
          --warn:#B9761F; --warnwash:#FFF6E7; --warnline:#F4C77B; --dark:#3D3730; --ok:#2E8B57; --ok2:#4CAF7D; --okwash:#E4F7EC;
        }
        .app-root.theme-ocean {
          --bg:#EFF9F9; --bg2:#DDF1F2; --card:#FFFFFF; --ink:#16323A; --ink2:#355760; --muted:#6B8D95; --faint:#97B2B8; --faint2:#B3CACE;
          --line:#D3E9EB; --line2:#B2D3D8; --q:#2A86BA; --q-rgb:42,134,186; --qwash:#DCEEF8; --qwash2:#C2E0F1; --qsoft:#9CCBE6; --qdark:#1B5C84;
          --a:#1FA58A; --awash:#DCF4EE; --awash2:#BFEADF; --adark:#12695A; --amid:#178A74; --sand:#4DB3BF; --sandline:#7FC4CC;
          --warn:#1D7C86; --warnwash:#E1F4F5; --warnline:#8ED0D6; --dark:#1F4651; --ok:#1F8F6B; --ok2:#3DB88F; --okwash:#DDF4EC;
        }
        .app-root.theme-calm {
          --bg:#F3F3F1; --bg2:#E9E9E7; --card:#FFFFFF; --ink:#262626; --ink2:#454545; --muted:#858585; --faint:#A6A6A6; --faint2:#BDBDBD;
          --line:#E2E2E0; --line2:#CDCDCB; --q:#4D4D4D; --q-rgb:77,77,77; --qwash:#E7E7E5; --qwash2:#DADAD8; --qsoft:#BDBDBB; --qdark:#2E2E2E;
          --a:#7A7A7A; --awash:#EDEDEB; --awash2:#E0E0DE; --adark:#3F3F3F; --amid:#5C5C5C; --sand:#9A9A9A; --sandline:#B5B5B3;
          --warn:#5A5A5A; --warnwash:#ECECEA; --warnline:#C2C2C0; --dark:#444444; --ok:#5E5E5E; --ok2:#808080; --okwash:#EBEBE9;
        }
        .app-root.theme-calm .blob, .app-root.theme-calm .category-blob, .app-root.theme-calm .reo-launch-emoji, .app-root.theme-calm .onboarding-blob,
        .app-root.theme-calm .confetti, .app-root.theme-calm .count-scene, .app-root.theme-calm .location-scene, .app-root.theme-calm .tile-blob { filter: grayscale(1); }
        .app-root.theme-calm * { animation-duration: 0.4s !important; }
        .theme-bar { display: flex; align-items: center; gap: 4px; margin: 36px 0 4px; padding: 4px; background: var(--card); border: 2px solid var(--line); border-radius: 999px; z-index: 5; }
        .theme-btn { display: flex; align-items: center; gap: 6px; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 13px; border: none; background: transparent; color: var(--muted); border-radius: 999px; padding: 7px 12px; cursor: pointer; }
        .theme-btn:hover { color: var(--ink2); }
        .theme-btn.active { background: var(--qwash); color: var(--q); }
        .theme-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--card); box-shadow: 0 0 0 1px var(--line2); }
        .theme-btn:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
        @media (max-width: 560px) { .theme-btn { padding: 7px 9px; font-size: 12px; } .theme-bar { margin-top: 44px; } }

        * { box-sizing: border-box; }

        .app-root {
          min-height: 100vh;
          width: 100%;
          background: radial-gradient(circle at 15% 10%, var(--bg2) 0%, var(--bg) 45%, var(--bg) 100%);
          font-family: 'Nunito', sans-serif;
          color: var(--ink);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 20px 20px;
          position: relative;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .brand-text {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: 0.2px;
          color: var(--ink);
        }
        .brand-text span { color: var(--q); }

        /* Clock-with-sand logo */
        .clock-logo { width: 34px; height: 34px; flex-shrink: 0; }
        .clock-face {
          width: 100%; height: 100%;
          border-radius: 50%;
          border: 3px solid var(--ink);
          background: var(--bg);
          position: relative;
          overflow: hidden;
        }
        .sand-fill {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(180deg, var(--warnline) 0%, var(--sand) 100%);
          animation: fillSand 6s ease-in-out infinite;
        }
        @keyframes fillSand {
          0% { height: 0%; }
          50% { height: 100%; }
          100% { height: 0%; }
        }
        .clock-hand {
          position: absolute;
          background: var(--ink);
          left: 50%;
          bottom: 50%;
          transform-origin: bottom center;
          border-radius: 2px;
          z-index: 2;
        }
        .clock-hand.hour { width: 2px; height: 6px; transform: translateX(-50%) rotate(45deg); }
        .clock-hand.minute { width: 2px; height: 9px; transform: translateX(-50%) rotate(160deg); }

        /* Language selector */
        .lang-selector {
          position: absolute;
          top: 24px;
          right: 20px;
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }
        .lang-selector-group { position: relative; }
        .lang-btn {
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 13px;
          background: var(--card);
          border: 2px solid var(--line);
          border-radius: 999px;
          padding: 9px 14px;
          cursor: pointer;
          color: var(--ink2);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .lang-btn:hover { border-color: var(--line2); }
        .lang-current { font-size: 15px; }
        .lang-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--card);
          border-radius: 16px;
          box-shadow: 0 12px 28px -8px rgba(43,38,33,0.2);
          padding: 8px;
          min-width: 190px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 320px;
          overflow-y: auto;
        }
        .lang-option {
          text-align: left;
          background: none;
          border: none;
          padding: 10px 12px;
          border-radius: 10px;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          color: var(--ink2);
        }
        .lang-option:hover { background: var(--bg); }
        .lang-option.active { background: var(--qwash); color: var(--q); }

        /* Random select toggle */
        .random-toggle {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 14px;
          background: var(--card);
          border: 2px solid var(--line);
          border-radius: 999px;
          padding: 10px 18px 10px 14px;
          cursor: pointer;
          color: var(--ink2);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .random-toggle-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--line2);
          transition: background 150ms ease;
        }
        .random-toggle.on { border-color: var(--sand); color: var(--warn); background: var(--warnwash); }
        .random-toggle.on .random-toggle-dot { background: var(--sand); }

        /* Age group selector */
        .age-selector {
          display: flex;
          background: var(--card);
          border: 2px solid var(--line);
          border-radius: 999px;
          padding: 4px;
          gap: 2px;
        }
        .age-option {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 13px;
          background: none;
          border: none;
          border-radius: 999px;
          padding: 8px 14px;
          cursor: pointer;
          color: var(--muted);
        }
        .age-option:hover { color: var(--ink2); }
        .age-option.active { background: var(--qwash); color: var(--q); }

        .home-random-row {
          margin-top: 26px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* Home screen */
        .home-screen {
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 8px;
        }
        .home-hero { text-align: center; margin-bottom: 18px; }
        .home-hero .brand { justify-content: center; }
        .home-tagline { color: var(--muted); font-weight: 600; margin-top: 10px; font-size: 15px; }

        .category-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 18px;
        }

        .category-card {
          background: var(--card);
          border: none;
          border-radius: 28px;
          box-shadow: 0 14px 30px -12px rgba(43,38,33,0.14), 0 4px 10px rgba(43,38,33,0.05);
          padding: 30px 22px;
          text-align: center;
          cursor: pointer;
          transition: transform 180ms ease, box-shadow 180ms ease;
          font-family: 'Nunito', sans-serif;
        }
        .category-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 38px -14px rgba(43,38,33,0.22);
        }
        .category-blob {
          width: 96px;
          height: 96px;
          margin: 0 auto 14px;
          border-radius: 44% 56% 58% 42% / 48% 44% 56% 52%;
          background: linear-gradient(135deg, var(--qwash) 0%, var(--qwash2) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 46px;
        }
        .category-title {
          font-family: 'Baloo 2', sans-serif;
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .category-desc {
          font-size: 14px;
          color: var(--muted);
          font-weight: 600;
          margin: 0;
          line-height: 1.4;
        }
        .category-desc-translated {
          font-size: 13px;
          color: var(--sandline);
          font-weight: 600;
          margin: 6px 0 0;
          line-height: 1.4;
        }

        /* Game screen */
        .game-screen {
          width: 100%;
          max-width: 760px;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .game-card {
          width: 100%;
          background: var(--card);
          border-radius: 32px;
          box-shadow: 0 18px 40px -12px rgba(43, 38, 33, 0.14), 0 4px 12px rgba(43,38,33,0.06);
          padding: 44px 40px 40px;
          text-align: center;
          animation: cardIn 260ms ease;
          position: relative;
          min-height: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .card-kind {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 13px;
          padding: 7px 16px;
          border-radius: 999px;
          letter-spacing: 0.3px;
        }

        .blob {
          width: 168px;
          height: 168px;
          border-radius: 44% 56% 58% 42% / 48% 44% 56% 52%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px auto 26px;
        }

        .blob-emoji {
          font-size: 82px;
          line-height: 1;
          filter: drop-shadow(0 6px 10px rgba(0,0,0,0.08));
        }

        .title-en {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 700;
          font-size: 30px;
          margin: 0 0 4px;
          color: var(--ink);
          line-height: 1.3;
        }

        .title-hi {
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: var(--muted);
          margin: 0;
        }

        .completion .confetti { font-size: 56px; margin-bottom: 12px; }
        .completion-buttons {
          display: flex;
          gap: 16px;
          margin-top: 28px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .home-link-btn { margin-top: 16px; max-width: 260px; }

        /* Random Select panel */
        .pick-student-btn {
          margin-top: 18px;
          max-width: 260px;
          border-color: var(--sand);
          color: var(--warn);
        }
        .random-panel {
          margin-top: 18px;
          width: 100%;
          background: var(--warnwash);
          border: 2px solid var(--warnline);
          border-radius: 24px;
          padding: 22px 26px;
          text-align: center;
          animation: cardIn 220ms ease;
        }
        .random-panel-label {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 14px;
          color: var(--warn);
          margin-bottom: 6px;
        }
        .random-panel-criterion {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: var(--ink);
          margin-bottom: 18px;
        }
        .random-panel-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .nav-bar {
          width: 100%;
          max-width: 760px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 22px;
        }

        .shuffle-row {
          width: 100%;
          max-width: 760px;
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .shuffle-btn { max-width: 220px; }

        /* Autopilot */
        .autopilot-toggle {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 15px;
          background: var(--ink);
          color: var(--card);
          border: none;
          border-radius: 18px;
          padding: 12px 20px;
          cursor: pointer;
          max-width: 220px;
        }
        .autopilot-toggle:hover { background: var(--dark); }

        .autopilot-field { margin-bottom: 18px; text-align: left; }
        .autopilot-field-label {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .autopilot-summary {
          font-size: 14px;
          color: var(--ink2);
          font-weight: 700;
          text-align: center;
          background: var(--bg);
          border-radius: 14px;
          padding: 12px 16px;
          margin: 4px 0 18px;
          line-height: 1.5;
        }
        .autopilot-modal { max-width: 460px; }
        .turn-badge-count {
          font-weight: 700;
          opacity: 0.8;
        }

        .autopilot-runner {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .turn-badge.sharing { background: var(--warnwash); color: var(--warn); }

        .autopilot-timer {
          margin-top: 22px;
          text-align: center;
        }
        .autopilot-timer-label {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 14px;
          color: var(--muted);
          margin-bottom: 4px;
        }
        .autopilot-timer-clock {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 800;
          font-size: 56px;
          color: var(--ink);
          line-height: 1;
        }
        .autopilot-manual-row {
          display: flex;
          gap: 8px;
          margin-top: 18px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .autopilot-nav-btn {
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 13px;
          background: var(--card);
          border: 2px solid var(--line);
          border-radius: 999px;
          padding: 8px 14px;
          cursor: pointer;
          color: var(--muted);
        }
        .autopilot-nav-btn:hover { border-color: var(--line2); color: var(--ink2); }
        .autopilot-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* Reo Practice launch banner (home screen) */
        .reo-launch-btn {
          width: 100%;
          max-width: 640px;
          margin-top: 22px;
          background: linear-gradient(135deg, var(--awash) 0%, var(--awash2) 100%);
          border: none;
          border-radius: 24px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          cursor: pointer;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .bi { display: inline-flex; flex-direction: column; align-items: inherit; line-height: 1.25; vertical-align: middle; text-align: inherit; }
        .bi-en { display: block; }
        .bi-es { display: block; font-size: 0.82em; font-style: italic; color: var(--amid); font-weight: 700; }
        .bi-es.solo { font-size: 1em; font-style: normal; color: inherit; }
        .tutor-launch-btn { border-color: var(--a); }
        .reo-launch-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -12px rgba(43,38,33,0.2); }
        .reo-launch-emoji { font-size: 40px; flex-shrink: 0; }
        .reo-launch-text { display: flex; flex-direction: column; gap: 4px; }
        .reo-launch-title { font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 19px; color: var(--adark); }
        .reo-launch-desc { font-family: 'Nunito', sans-serif; font-weight: 600; font-size: 13px; color: var(--adark); line-height: 1.4; }

        /* Reo Practice task screen */
        .reo-tagline { color: var(--muted); font-weight: 600; font-size: 14px; margin: 4px 0 12px; text-align: center; }
        .reo-task { display: flex; flex-direction: column; align-items: center; width: 100%; }
        .reo-task-kind {
          font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 13px;
          color: var(--a); background: var(--awash); padding: 7px 16px; border-radius: 999px; margin-bottom: 18px;
        }
        .location-scene {
          position: relative; width: 140px; height: 140px; margin-bottom: 18px;
          display: flex; align-items: center; justify-content: center;
        }
        .location-scene-noun { font-size: 72px; z-index: 1; }
        .location-scene-marker { position: absolute; font-size: 34px; }
        .reo-english-hint { color: var(--muted); font-weight: 600; font-size: 15px; margin: 0 0 10px; }
        .reo-sentence { font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 28px; color: var(--ink); margin: 0 0 20px; text-align: center; }
        .reo-blank { color: var(--q); border-bottom: 3px dashed var(--qsoft); padding: 0 4px; }
        .reo-options { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 14px; }
        .reo-option {
          font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 17px;
          background: var(--card); border: 2px solid var(--line); border-radius: 16px; padding: 12px 20px; cursor: pointer;
        }
        .reo-option:hover:not(:disabled) { border-color: var(--line2); }
        .reo-option.correct { background: var(--okwash); border-color: var(--ok2); color: var(--ok); }
        .reo-option.incorrect { background: var(--qwash); border-color: var(--q); color: var(--qdark); }
        .reo-option.reveal-correct { background: var(--okwash); border-color: var(--ok2); color: var(--ok); }
        .reo-option:disabled { cursor: default; }
        .reo-feedback { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 15px; margin-top: 4px; }
        .reo-feedback.good { color: var(--ok); }
        .reo-feedback.oops { color: var(--qdark); }
        .reo-answer-row {
          min-height: 56px; width: 100%; max-width: 420px; background: var(--bg); border: 2px dashed var(--line);
          border-radius: 16px; padding: 10px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .reo-answer-placeholder { color: var(--faint); font-weight: 600; font-size: 13px; }
        .reo-word-bank { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 18px; }
        .reo-tile {
          font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 16px;
          background: var(--card); border: 2px solid var(--line); border-radius: 12px; padding: 10px 16px; cursor: grab;
        }
        .reo-tile:hover { border-color: var(--line2); }
        .reo-tile.answer { background: var(--qwash); border-color: var(--q); color: var(--qdark); cursor: pointer; }
        .reo-builder-buttons { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

        /* New Reo Practice visuals */
        .colour-scene {
          width: 140px; height: 140px; border-radius: 50%; margin-bottom: 18px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 0 0 4px rgba(255,255,255,0.5);
        }
        .colour-scene-noun { font-size: 62px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
        .count-scene {
          display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center;
          max-width: 280px; margin-bottom: 18px; min-height: 100px;
        }
        .count-scene-item { font-size: 34px; }

        .reo-task-footer { display: flex; gap: 12px; align-items: center; justify-content: center; margin: 6px 0 4px; flex-wrap: wrap; }
        .reo-pronounce-btn, .reo-hint-btn {
          font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px;
          background: var(--card); border: 2px solid var(--line); border-radius: 999px;
          padding: 8px 14px; cursor: pointer; color: var(--ink2); display: flex; align-items: center; gap: 6px;
        }
        .reo-pronounce-btn:hover, .reo-hint-btn:hover { border-color: var(--line2); }
        .reo-hint-text {
          font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 14px; color: var(--warn);
          background: var(--warnwash); border-radius: 12px; padding: 10px 14px; margin-top: 8px; text-align: center;
        }
        .reo-key-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 20px; height: 20px; font-size: 11px; font-weight: 800;
          background: var(--ink); color: var(--card); border-radius: 6px; padding: 0 4px;
        }
        .reo-key-badge.small { min-width: 16px; height: 16px; font-size: 10px; }
        .reo-keys-legend {
          margin-top: 16px; font-size: 12px; color: var(--faint); text-align: center; max-width: 640px; line-height: 1.6;
        }

        .reo-category-block { width: 100%; max-width: 680px; display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 8px; }

        .reo-english-toggle {
          font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 13px;
          background: var(--card); border: 2px solid var(--line); border-radius: 999px;
          padding: 9px 16px; cursor: pointer; color: var(--muted); margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .reo-english-toggle-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--line2); }
        .reo-english-toggle.on { border-color: var(--a); color: var(--adark); background: var(--awash); }
        .reo-english-toggle.on .reo-english-toggle-dot { background: var(--a); }
        .reo-category-grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .reo-category-pill { font-size: 13px; }
        .reo-category-actions { display: flex; gap: 10px; }
        .reo-mini-btn {
          font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px;
          background: none; border: none; color: var(--muted); text-decoration: underline; cursor: pointer; padding: 2px 4px;
        }
        .reo-mini-btn:hover { color: var(--ink2); }

        .student-mode-card {
          margin-top: 26px; width: 100%; max-width: 640px; background: var(--bg2);
          border: 2px dashed var(--line2); border-radius: 20px; padding: 16px 20px;
          display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; text-align: center;
        }
        .student-mode-badge {
          font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 11px; letter-spacing: 0.5px;
          background: var(--ink); color: var(--card); border-radius: 999px; padding: 3px 10px; margin-bottom: 4px;
        }
        .student-mode-title { font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 17px; color: var(--ink2); }
        .student-mode-desc { font-family: 'Nunito', sans-serif; font-weight: 600; font-size: 12px; color: var(--muted); max-width: 480px; }

        /* Creator credit */
        .creator-credit {
          margin-top: 28px;
          text-align: center;
          font-family: 'Nunito', sans-serif;
          font-size: 12px;
          color: var(--faint2);
        }
        .creator-credit a { color: var(--faint2); text-decoration: underline; }
        .creator-credit a:hover { color: var(--muted); }

        .autopilot-controls {
          display: flex;
          gap: 14px;
          margin-top: 22px;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* Bigger in-flow badge once sharing begins */
        .turn-badge-big {
          font-size: 26px;
          padding: 16px 30px;
        }

        /* Big temporary reveal pop-up when sharing time starts */
        .reveal-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(43,38,33,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 60;
          padding: 20px;
          animation: fadeIn 200ms ease;
        }
        .reveal-popup {
          background: var(--card);
          border-radius: 32px;
          padding: 48px 56px;
          text-align: center;
          box-shadow: 0 30px 60px -12px rgba(43,38,33,0.4);
          animation: popIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
          max-width: 520px;
        }
        .reveal-popup-kicker {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 18px;
          color: var(--q);
          margin-bottom: 10px;
        }
        .reveal-popup-name {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 800;
          font-size: 40px;
          color: var(--ink);
          line-height: 1.25;
          margin-bottom: 18px;
        }
        .reveal-popup-quiet {
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: var(--warn);
          background: var(--warnwash);
          border-radius: 14px;
          padding: 12px 16px;
        }

        /* Smaller, quicker mid-share quiet reminder */
        .quiet-reminder-overlay {
          position: fixed;
          top: 24px;
          left: 50%;
          z-index: 60;
          animation: popInCentered 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .quiet-reminder {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 800;
          font-size: 24px;
          color: var(--warn);
          background: var(--warnwash);
          border: 2px solid var(--warnline);
          border-radius: 999px;
          padding: 14px 28px;
          box-shadow: 0 12px 28px -8px rgba(43,38,33,0.25);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes popInCentered {
          from { opacity: 0; transform: translateX(-50%) scale(0.85); }
          to { opacity: 1; transform: translateX(-50%) scale(1); }
        }

        .btn {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 17px;
          border: none;
          border-radius: 18px;
          padding: 18px 26px;
          cursor: pointer;
          transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }
        .btn:active { transform: scale(0.97); }
        .btn:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }

        .btn-primary {
          background: var(--q);
          color: var(--card);
          box-shadow: 0 8px 18px -6px rgba(var(--q-rgb),0.55);
          flex: 1;
          max-width: 220px;
        }
        .btn-primary:hover { box-shadow: 0 10px 22px -6px rgba(var(--q-rgb),0.7); }

        .btn-secondary {
          background: var(--card);
          color: var(--ink2);
          border: 2px solid var(--line);
          flex: 1;
          max-width: 220px;
        }
        .btn-secondary:hover { border-color: var(--line2); }
        .btn-secondary:disabled { opacity: 0.35; cursor: not-allowed; }

        .progress {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 700;
          font-size: 17px;
          color: var(--muted);
          min-width: 100px;
          text-align: center;
        }

        .hint { margin-top: 14px; font-size: 13px; color: var(--faint); text-align: center; }

        /* Help button */
        .help-btn {
          position: absolute;
          top: 24px;
          left: 20px;
          z-index: 20;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 13px;
          background: var(--card);
          border: 2px solid var(--line);
          border-radius: 999px;
          padding: 9px 14px;
          cursor: pointer;
          color: var(--ink2);
        }
        .help-btn:hover { border-color: var(--line2); }

        /* Onboarding modal (shares the generic modal look) */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(43,38,33,0.35);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 20px;
        }
        .modal-overlay.open { display: flex; }
        .modal {
          background: var(--card);
          border-radius: 28px;
          padding: 32px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 24px 50px -12px rgba(43,38,33,0.3);
          animation: cardIn 220ms ease;
          text-align: center;
        }
        .modal-title {
          font-family: 'Baloo 2', sans-serif;
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 10px;
        }
        .onboarding-blob {
          width: 84px;
          height: 84px;
          margin: 0 auto 16px;
          border-radius: 44% 56% 58% 42% / 48% 44% 56% 52%;
          background: linear-gradient(135deg, var(--qwash) 0%, var(--qwash2) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }
        .onboarding-body {
          font-size: 15px;
          color: var(--ink2);
          font-weight: 600;
          line-height: 1.5;
          margin: 0 0 22px;
        }
        .onboarding-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 22px;
        }
        .onboarding-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--line);
        }
        .onboarding-dot.active { background: var(--q); }
        .onboarding-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .onboarding-lang-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 22px;
        }
        .onboarding-lang-option {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg);
          border: 2px solid var(--line);
          border-radius: 14px;
          padding: 10px 12px;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: var(--ink2);
          cursor: pointer;
          text-align: left;
        }
        .onboarding-lang-option:hover { border-color: var(--line2); }
        .onboarding-lang-option.active { background: var(--qwash); border-color: var(--q); color: var(--q); }
        .onboarding-lang-flag { font-size: 17px; }

        /* Age-group visual scaling — bigger & bolder for younger years,
           closer to standard for older years. Years 5/6 uses the base sizes above. */
        .age-y1-2 .blob { width: 208px; height: 208px; }
        .age-y1-2 .blob-emoji { font-size: 104px; }
        .age-y1-2 .title-en { font-size: 40px; }
        .age-y1-2 .title-hi { font-size: 22px; }
        .age-y1-2 .category-blob { width: 116px; height: 116px; }
        .age-y1-2 .category-blob span { font-size: 56px; }
        .age-y1-2 .category-title { font-size: 26px; }
        .age-y1-2 .category-desc, .age-y1-2 .category-desc-translated { font-size: 16px; }
        .age-y1-2 .btn { font-size: 19px; padding: 20px 28px; }
        .age-y1-2 .card-kind { font-size: 14px; padding: 8px 18px; }

        .age-y3-4 .blob { width: 186px; height: 186px; }
        .age-y3-4 .blob-emoji { font-size: 92px; }
        .age-y3-4 .title-en { font-size: 33px; }
        .age-y3-4 .category-blob { width: 104px; height: 104px; }
        .age-y3-4 .category-blob span { font-size: 50px; }
        .age-y3-4 .category-title { font-size: 23px; }

        .age-y7-8 .blob { width: 150px; height: 150px; }
        .age-y7-8 .blob-emoji { font-size: 68px; }
        .age-y7-8 .title-en { font-size: 27px; }
        .age-y7-8 .title-hi { font-size: 16px; }
        .age-y7-8 .category-blob { width: 88px; height: 88px; }
        .age-y7-8 .category-blob span { font-size: 40px; }
        .age-y7-8 .category-title { font-size: 20px; }
        .age-y7-8 .game-card { padding: 38px 40px 34px; min-height: 380px; }

        @media (max-width: 560px) {
          .category-grid { grid-template-columns: 1fr; }
          .game-card { padding: 34px 22px 30px; min-height: 380px; }
          .title-en { font-size: 24px; }
          .title-hi { font-size: 15px; }
          .blob { width: 128px; height: 128px; }
          .blob-emoji { font-size: 62px; }
          .btn { font-size: 15px; padding: 15px 18px; }
          .nav-bar { flex-wrap: nowrap; }
          .lang-selector { top: 16px; right: 12px; }
          .help-btn { top: 16px; left: 12px; }
          .brand-text { font-size: 19px; }
        }
      `}</style>

      <LanguageSelector
        primaryLanguage={primaryLanguage}
        setPrimaryLanguage={setPrimaryLanguage}
        secondaryLanguage={secondaryLanguage}
        setSecondaryLanguage={setSecondaryLanguage}
      />

      <div className="theme-bar" role="group" aria-label="Colour theme">
        {[["sunny", "Sunny", "#FF6B57", "#2BB3A3"], ["ocean", "Ocean", "#2A86BA", "#1FA58A"], ["calm", "Calm", "#4D4D4D", "#BDBDBD"]].map(([id, label, c1, c2]) => (
          <button key={id} className={`theme-btn ${theme === id ? "active" : ""}`} onClick={() => setTheme(id)} aria-pressed={theme === id}>
            <span className="theme-dot" style={{ background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }} />
            {label}
          </button>
        ))}
      </div>

      <button className="help-btn" onClick={() => setShowOnboarding(true)} aria-label="Show welcome tutorial">
        ❓ Help
      </button>

      {showOnboarding && (
        <OnboardingModal
          primaryLanguage={primaryLanguage}
          setPrimaryLanguage={setPrimaryLanguage}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {screen === "home" ? (
        <HomeScreen
          primaryLanguage={primaryLanguage}
          secondaryLanguage={secondaryLanguage}
          ageGroup={ageGroup}
          setAgeGroup={setAgeGroup}
          randomSelectEnabled={randomSelectEnabled}
          setRandomSelectEnabled={setRandomSelectEnabled}
          onSelectCategory={selectCategory}
          onOpenReo={openReo}
          onOpenTutor={openTutor}
        />
      ) : screen === "reo" ? (
        <ReoPracticeScreen onHome={goHome} />
      ) : screen === "tutor" ? (
        <TutorZoneScreen onHome={goHome} />
      ) : (
        <>
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <Logo onClick={goHome} />
            <AgeGroupSelector ageGroup={ageGroup} setAgeGroup={setAgeGroup} />
            <RandomSelectToggle enabled={randomSelectEnabled} setEnabled={setRandomSelectEnabled} />
          </div>
          <GameScreen category={category} primaryLanguage={primaryLanguage} secondaryLanguage={secondaryLanguage} ageGroup={ageGroup} randomSelectEnabled={randomSelectEnabled} onHome={goHome} />
        </>
      )}

      <div className="creator-credit">
        Created by Richard Simpson —{" "}
        <a href="https://richard-simpson-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer">
          richard-simpson-portfolio.vercel.app
        </a>
      </div>
    </div>
  );
}
