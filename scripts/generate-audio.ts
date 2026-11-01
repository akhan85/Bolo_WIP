import fs from "fs";
import path from "path";

import "dotenv/config";

import { createBuilder, type MissingAudio } from "./curriculum/build";
import { loadCurriculum } from "./curriculum/load";

// Creates the missing lesson audio with Azure's Pakistani Urdu neural voices.
//
//   npm run audio:generate -- --sample        6 test clips → audio-samples/
//   npm run audio:generate -- --only "Start Here" --limit 20
//   npm run audio:generate                   every missing clip → public/sound/
//
// Files that already exist are never overwritten, so your own recordings are
// safe. Run `npm run db:prod` afterwards so lessons pick up the new files.

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;

const FEMALE_VOICE = "ur-PK-UzmaNeural";
const MALE_VOICE = "ur-PK-AsadNeural";
const RATE = "-10%"; // a little slower than normal, like a teacher

const PUBLIC_DIR = path.join(process.cwd(), "public");
const SAMPLE_DIR = path.join(process.cwd(), "audio-samples");

// A lone letter is read silently or garbled, so say the letter's name.
const LETTER_NAMES: Record<string, string> = {
  ا: "الف",
  آ: "الف مد",
  ب: "بے",
  پ: "پے",
  ت: "تے",
  ٹ: "ٹے",
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

const spokenText = (clip: MissingAudio) => {
  const text = clip.urdu.replace(/[ـ]/g, "").trim();
  return LETTER_NAMES[text] ?? text;
};

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

const synthesize = async (text: string, voice: string) => {
  const ssml =
    `<speak version="1.0" xml:lang="ur-PK"><voice name="${voice}">` +
    `<prosody rate="${RATE}">${escapeXml(text)}</prosody></voice></speak>`;

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

  for (const clip of clips) {
    const target = sample
      ? path.join(outDir, path.basename(clip.file))
      : path.join(outDir, clip.file);
    if (fs.existsSync(target)) continue;

    try {
      fs.writeFileSync(
        target,
        await synthesize(spokenText(clip), voiceFor(clip))
      );
      done++;
      console.log(`  ✓ ${clip.file}  ${clip.urdu}`);
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
  if (!sample && done)
    console.log(
      'Next: run "npm run db:prod" so the lessons use the new audio.'
    );
};

void main();
