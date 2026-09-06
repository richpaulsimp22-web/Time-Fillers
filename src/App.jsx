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
   CATEGORY LIBRARY — 4 categories x 25 cards (20 questions + 5 activities)
   translations: { hi, es, fr, mi, zh, sm }
------------------------------------------------------------------- */

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
  { seconds: 60, label: "1:00" },
  { seconds: 90, label: "1:30" },
  { seconds: 180, label: "3:00" },
];

const STUDENT_COUNT_OPTIONS = [1, 2, 3, 4];

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

function AutopilotRunner({ deck, settings, primaryLanguage, secondaryLanguage, ageGroup, onExit }) {
  const [order] = useState(() => (settings.order === "random" ? shuffle(deck) : deck));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("discuss"); // 'discuss' | 'share'
  const [timeLeft, setTimeLeft] = useState(settings.duration);
  const [paused, setPaused] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState(() => shuffle(RANDOM_CRITERIA).slice(0, settings.studentsPerQuestion));
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
    setSelectedCriteria(shuffle(RANDOM_CRITERIA).slice(0, settings.studentsPerQuestion));
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

function HomeScreen({ primaryLanguage, secondaryLanguage, ageGroup, setAgeGroup, randomSelectEnabled, setRandomSelectEnabled, onSelectCategory }) {
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
  const accent = isActivity ? "#2BB3A3" : "#FF6B57";
  const primaryText = getCardText(card, primaryLanguage, ageGroup);
  const secondaryText = secondaryLanguage !== primaryLanguage ? getCardText(card, secondaryLanguage, ageGroup) : null;

  return (
    <div key={animKey} className="game-card">
      <span className="card-kind" style={{ color: accent, background: isActivity ? "#DFF6F2" : "#FFE7E1" }}>
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
  const [autopilotSettings, setAutopilotSettings] = useState({ order: "sequential", duration: 60, studentsPerQuestion: 1, shareDuration: 30 });

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

  function selectCategory(cat) {
    setCategory(cat);
    setScreen("game");
  }

  function goHome() {
    setScreen("home");
    setCategory(null);
  }

  return (
    <div className={`app-root age-${ageGroup.replace("_", "-")}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@400;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .app-root {
          min-height: 100vh;
          width: 100%;
          background: radial-gradient(circle at 15% 10%, #FFF1E4 0%, #FFF7ED 45%, #FFF7ED 100%);
          font-family: 'Nunito', sans-serif;
          color: #2B2621;
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
          color: #2B2621;
        }
        .brand-text span { color: #FF6B57; }

        /* Clock-with-sand logo */
        .clock-logo { width: 34px; height: 34px; flex-shrink: 0; }
        .clock-face {
          width: 100%; height: 100%;
          border-radius: 50%;
          border: 3px solid #2B2621;
          background: #FFF7ED;
          position: relative;
          overflow: hidden;
        }
        .sand-fill {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(180deg, #F4C77B 0%, #E8A94E 100%);
          animation: fillSand 6s ease-in-out infinite;
        }
        @keyframes fillSand {
          0% { height: 0%; }
          50% { height: 100%; }
          100% { height: 0%; }
        }
        .clock-hand {
          position: absolute;
          background: #2B2621;
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
          background: #FFFFFF;
          border: 2px solid #EFE6DA;
          border-radius: 999px;
          padding: 9px 14px;
          cursor: pointer;
          color: #4A4339;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .lang-btn:hover { border-color: #D9CCB9; }
        .lang-current { font-size: 15px; }
        .lang-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #FFFFFF;
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
          color: #4A4339;
        }
        .lang-option:hover { background: #FFF7ED; }
        .lang-option.active { background: #FFE7E1; color: #FF6B57; }

        /* Random select toggle */
        .random-toggle {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 14px;
          background: #FFFFFF;
          border: 2px solid #EFE6DA;
          border-radius: 999px;
          padding: 10px 18px 10px 14px;
          cursor: pointer;
          color: #4A4339;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .random-toggle-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #D9CCB9;
          transition: background 150ms ease;
        }
        .random-toggle.on { border-color: #E8A94E; color: #B9761F; background: #FFF6E7; }
        .random-toggle.on .random-toggle-dot { background: #E8A94E; }

        /* Age group selector */
        .age-selector {
          display: flex;
          background: #FFFFFF;
          border: 2px solid #EFE6DA;
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
          color: #9C9284;
        }
        .age-option:hover { color: #4A4339; }
        .age-option.active { background: #FFE7E1; color: #FF6B57; }

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
        .home-tagline { color: #9C9284; font-weight: 600; margin-top: 10px; font-size: 15px; }

        .category-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 18px;
        }

        .category-card {
          background: #FFFFFF;
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
          background: linear-gradient(135deg, #FFE7E1 0%, #FFD9CF 100%);
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
          color: #9C9284;
          font-weight: 600;
          margin: 0;
          line-height: 1.4;
        }
        .category-desc-translated {
          font-size: 13px;
          color: #C2A876;
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
          background: #FFFFFF;
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
          color: #2B2621;
          line-height: 1.3;
        }

        .title-hi {
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: #9C9284;
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
          border-color: #E8A94E;
          color: #B9761F;
        }
        .random-panel {
          margin-top: 18px;
          width: 100%;
          background: #FFF6E7;
          border: 2px solid #F4C77B;
          border-radius: 24px;
          padding: 22px 26px;
          text-align: center;
          animation: cardIn 220ms ease;
        }
        .random-panel-label {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 14px;
          color: #B9761F;
          margin-bottom: 6px;
        }
        .random-panel-criterion {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: #2B2621;
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
          background: #2B2621;
          color: #FFFFFF;
          border: none;
          border-radius: 18px;
          padding: 12px 20px;
          cursor: pointer;
          max-width: 220px;
        }
        .autopilot-toggle:hover { background: #3D3730; }

        .autopilot-field { margin-bottom: 18px; text-align: left; }
        .autopilot-field-label {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 13px;
          color: #9C9284;
          margin-bottom: 8px;
        }
        .autopilot-summary {
          font-size: 14px;
          color: #4A4339;
          font-weight: 700;
          text-align: center;
          background: #FFF7ED;
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
        .turn-badge.sharing { background: #FFF6E7; color: #B9761F; }

        .autopilot-timer {
          margin-top: 22px;
          text-align: center;
        }
        .autopilot-timer-label {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 14px;
          color: #9C9284;
          margin-bottom: 4px;
        }
        .autopilot-timer-clock {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 800;
          font-size: 56px;
          color: #2B2621;
          line-height: 1;
        }
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
          background: #FFFFFF;
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
          color: #FF6B57;
          margin-bottom: 10px;
        }
        .reveal-popup-name {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 800;
          font-size: 40px;
          color: #2B2621;
          line-height: 1.25;
          margin-bottom: 18px;
        }
        .reveal-popup-quiet {
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: #B9761F;
          background: #FFF6E7;
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
          color: #B9761F;
          background: #FFF6E7;
          border: 2px solid #F4C77B;
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
        .btn:focus-visible { outline: 3px solid #2B2621; outline-offset: 3px; }

        .btn-primary {
          background: #FF6B57;
          color: #FFFFFF;
          box-shadow: 0 8px 18px -6px rgba(255,107,87,0.55);
          flex: 1;
          max-width: 220px;
        }
        .btn-primary:hover { box-shadow: 0 10px 22px -6px rgba(255,107,87,0.7); }

        .btn-secondary {
          background: #FFFFFF;
          color: #4A4339;
          border: 2px solid #EFE6DA;
          flex: 1;
          max-width: 220px;
        }
        .btn-secondary:hover { border-color: #D9CCB9; }
        .btn-secondary:disabled { opacity: 0.35; cursor: not-allowed; }

        .progress {
          font-family: 'Baloo 2', sans-serif;
          font-weight: 700;
          font-size: 17px;
          color: #9C9284;
          min-width: 100px;
          text-align: center;
        }

        .hint { margin-top: 14px; font-size: 13px; color: #B0A695; text-align: center; }

        /* Help button */
        .help-btn {
          position: absolute;
          top: 24px;
          left: 20px;
          z-index: 20;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 13px;
          background: #FFFFFF;
          border: 2px solid #EFE6DA;
          border-radius: 999px;
          padding: 9px 14px;
          cursor: pointer;
          color: #4A4339;
        }
        .help-btn:hover { border-color: #D9CCB9; }

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
          background: #FFFFFF;
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
          background: linear-gradient(135deg, #FFE7E1 0%, #FFD9CF 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }
        .onboarding-body {
          font-size: 15px;
          color: #4A4339;
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
          background: #EFE6DA;
        }
        .onboarding-dot.active { background: #FF6B57; }
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
          background: #FFF7ED;
          border: 2px solid #EFE6DA;
          border-radius: 14px;
          padding: 10px 12px;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: #4A4339;
          cursor: pointer;
          text-align: left;
        }
        .onboarding-lang-option:hover { border-color: #D9CCB9; }
        .onboarding-lang-option.active { background: #FFE7E1; border-color: #FF6B57; color: #FF6B57; }
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
        />
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
    </div>
  );
}
