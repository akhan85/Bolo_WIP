import fs from "fs";
import path from "path";

import "dotenv/config";

import { createBuilder, type MissingAudio } from "./curriculum/build";
import {
  md5,
  readManifest,
  saveManifest,
  writeReviewList,
} from "./curriculum/ai-audio";
import { loadCurriculum } from "./curriculum/load";

// Creates the missing lesson audio with Azure's Pakistani Urdu neural voices.
//
//   npm run audio:generate -- --sample        6 test clips → audio-samples/
//   npm run audio:generate -- --only "Start Here" --limit 20
//   npm run audio:generate                   every missing clip → public/sound/
//   npm run audio:generate -- --try "سین | سات" --voice male --rate -25% --name test
//                                            one test clip → audio-samples/
//
// In any text, " | " becomes a half-second pause.
//
// Files that already exist are never overwritten, so your own recordings are
// safe. Run `npm run db:prod` afterwards so lessons pick up the new files.

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;

const FEMALE_VOICE = "ur-PK-UzmaNeural";
const MALE_VOICE = "ur-PK-AsadNeural";
// Slower than normal, like a teacher; letters slower still
const RATE = "-20%";
const LETTER_RATE = "-30%";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const SAMPLE_DIR = path.join(process.cwd(), "audio-samples");

// A lone letter is read silently or garbled, so say the letter's name.
const LETTER_NAMES: Record<string, string> = {
  ا: "الف",
  آ: "الف مد",
  ب: "بے",
  پ: "پے",
  // The voice misreads ٹے / تے; these spellings come out closest to "tay"
  ت: "تَے",
  ٹ: "tay",
  ث: "ثے",
  ج: "جیم",
  چ: "چے",
  ح: "بڑی حے",
  خ: "خے",
  د: "دال",
  ڈ: "ڈال",
  ذ: "ذال",
  ر: "رے",
  ڑ: "ڑے",
  ز: "زے",
  ژ: "ژے",
  س: "سین",
  ش: "شین",
  ص: "صاد",
  ض: "ضاد",
  ط: "طوئے",
  ظ: "ظوئے",
  ع: "عین",
  غ: "غین",
  ف: "فے",
  ق: "قاف",
  ک: "کاف",
  گ: "گاف",
  ل: "لام",
  م: "میم",
  ن: "نون",
  ں: "نون غنہ",
  و: "واؤ",
  ہ: "چھوٹی ہے",
  ھ: "دو چشمی ہے",
  ء: "ہمزہ",
  ی: "چھوٹی یے",
  ے: "بڑی یے",
};

const letterName = (clip: MissingAudio) =>
  LETTER_NAMES[clip.urdu.replace(/[ـ]/g, "").trim()];

const spokenText = (clip: MissingAudio) => letterName(clip) ?? clip.urdu.trim();

const rateFor = (clip: MissingAudio) => (letterName(clip) ? LETTER_RATE : RATE);

// Male and female speakers say some sentences differently (پیتا / پیتی).
const voiceFor = (clip: MissingAudio) => {
  const english = clip.english?.toLowerCase() ?? "";
  if (english.includes("(man)") || english.includes("to a man"))
    return MALE_VOICE;
  if (english.includes("(woman)") || english.includes("to a woman"))
    return FEMALE_VOICE;
  if (/(تا|رہا|ا ہوا|کا) ہوں/.test(clip.urdu)) return MALE_VOICE;
  return FEMALE_VOICE;
};

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The free tier allows about 20 requests a minute: pace requests, and wait
// and retry when Azure says "too many requests" (429).
const PAUSE_MS = 3200;

const synthesize = async (text: string, voice: string, rate = RATE) => {
  const body = text
    .split("|")
    .map((part) => escapeXml(part.trim()))
    .join('<break time="500ms"/>');
  const ssml =
    `<speak version="1.0" xml:lang="ur-PK"><voice name="${voice}">` +
    `<prosody rate="${rate}">${body}</prosody></voice></speak>`;

  const response = await fetch(
    `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": KEY!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "bolo-audio-generator",
      },
      body: ssml,
    }
  );

  if (!response.ok)
    throw new Error(`${response.status} ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
};

const synthesizeWithRetry = async (
  text: string,
  voice: string,
  rate: string
) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await synthesize(text, voice, rate);
    } catch (error) {
      if (!/^429/.test((error as Error).message) || attempt >= 5) throw error;
      await sleep(30_000 * attempt);
    }
  }
};

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1] ?? "";
};

const main = async () => {
  if (!KEY || !REGION) {
    console.error(
      "Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION in .env - see docs/RECORDING_GUIDE.md"
    );
    process.exit(1);
  }

  const tryText = arg("--try");
  if (tryText) {
    const voice = arg("--voice") === "male" ? MALE_VOICE : FEMALE_VOICE;
    const file = path.join(SAMPLE_DIR, `${arg("--name") ?? "try"}.mp3`);
    fs.mkdirSync(SAMPLE_DIR, { recursive: true });
    fs.writeFileSync(
      file,
      await synthesize(tryText, voice, arg("--rate") ?? RATE)
    );
    console.log(`Wrote ${path.relative(process.cwd(), file)}`);
    return;
  }

  const units = loadCurriculum();
  const builder = createBuilder(units);
  units.forEach((u) => u.lessons.forEach((l) => builder.buildLesson(u, l)));

  const sample = process.argv.includes("--sample");
  const only = arg("--only");
  const limit = Number(arg("--limit") ?? Infinity);

  let clips = builder
    .missingAudio()
    .filter((c) => !only || c.usedIn.startsWith(only));

  if (sample) {
    // A greeting, a question, two letters, a word and a gendered sentence
    const wanted = [
      "assalam_o_alaikum",
      "aap_kaise_hain",
      "seen",
      "tte",
      "shukriya",
      "main_roz_chai_peeta_hoon",
    ];
    clips = wanted
      .map((w) => clips.find((c) => c.file === `/sound/${w}.mp3`))
      .filter((c): c is MissingAudio => !!c);
  }

  clips = clips.slice(0, limit);
  const outDir = sample ? SAMPLE_DIR : PUBLIC_DIR;
  fs.mkdirSync(sample ? SAMPLE_DIR : path.join(PUBLIC_DIR, "sound"), {
    recursive: true,
  });

  console.log(`Generating ${clips.length} clip(s)...`);
  let done = 0;
  const failed: string[] = [];
  const manifest = readManifest();

  for (const clip of clips) {
    const target = sample
      ? path.join(outDir, path.basename(clip.file))
      : path.join(outDir, clip.file);
    if (fs.existsSync(target)) continue;

    try {
      const audio = await synthesizeWithRetry(
        spokenText(clip),
        voiceFor(clip),
        rateFor(clip)
      );
      fs.writeFileSync(target, audio);
      if (!sample) {
        const entry = { ...clip, md5: md5(audio) };
        const existing = manifest.findIndex((m) => m.file === clip.file);
        if (existing === -1) manifest.push(entry);
        else manifest[existing] = entry;
        saveManifest(manifest);
      }
      done++;
      console.log(`  ✓ ${clip.file}  ${clip.urdu}`);
      await sleep(PAUSE_MS);
    } catch (error) {
      failed.push(clip.file);
      console.log(`  ✗ ${clip.file}  ${(error as Error).message}`);
      // A bad key or region fails every request - stop early
      if (/^40[13]/.test((error as Error).message)) break;
    }
  }

  console.log(
    `\nCreated ${done} file(s) in ${path.relative(process.cwd(), outDir)}/`
  );
  if (failed.length)
    console.log(`${failed.length} failed - run again to retry.`);
  if (!sample && done) {
    const review = writeReviewList();
    console.log(
      `Review list: docs/assets/ai-audio-review.md (${review.toReview} AI clips to check)`
    );
    console.log(
      'Next: run "npm run db:prod" so the lessons use the new audio.'
    );
  }
};

void main();
