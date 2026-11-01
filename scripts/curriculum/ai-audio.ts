import crypto from "crypto";
import fs from "fs";
import path from "path";

// Keeps track of which audio files were made by the AI voice, so they can be
// reviewed and replaced with real recordings. A file whose contents no longer
// match what the AI produced is treated as replaced by a human recording.

export type AiClip = {
  file: string; // path under /public
  urdu: string;
  roman?: string;
  english?: string;
  usedIn: string;
  md5: string; // fingerprint of the AI-generated audio
};

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "docs", "assets", "ai-generated-audio.json");
const REVIEW_MD = path.join(ROOT, "docs", "assets", "ai-audio-review.md");

export const md5 = (data: Buffer) =>
  crypto.createHash("md5").update(data).digest("hex");

export const readManifest = (): AiClip[] =>
  fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : [];

export const saveManifest = (clips: AiClip[]) => {
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(clips, null, 2) + "\n");
};

const status = (clip: AiClip) => {
  const file = path.join(ROOT, "public", clip.file);
  if (!fs.existsSync(file)) return "missing";
  return md5(fs.readFileSync(file)) === clip.md5 ? "ai" : "replaced";
};

const cell = (s?: string) => (s ?? "").replace(/\|/g, "\\|");

// Writes docs/assets/ai-audio-review.md from the manifest.
export const writeReviewList = () => {
  const clips = readManifest();
  const rows = clips.map((c) => ({ ...c, status: status(c) }));
  const toReview = rows.filter((r) => r.status === "ai");

  const md = [
    "# AI-generated audio to review",
    "",
    "Generated automatically - don't edit by hand. Refresh with `npm run assets:report`.",
    "",
    `**${toReview.length} of ${rows.length}** clips still use the AI voice.`,
    "To replace one, record it yourself and save it over the file with the **same name** (see [RECORDING_GUIDE.md](../RECORDING_GUIDE.md)). It's marked ✅ here automatically.",
    "",
    "Play one from the terminal with `afplay public/sound/<name>.mp3`.",
    "",
    "| Status | Urdu | Romanized | Meaning | File |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.status === "ai" ? "🤖 review" : r.status === "replaced" ? "✅ replaced" : "⚠️ missing"} | ${cell(r.urdu)} | ${cell(r.roman)} | ${cell(r.english)} | \`public${r.file}\` |`
    ),
    "",
  ];

  fs.writeFileSync(REVIEW_MD, md.join("\n"));
  return { total: rows.length, toReview: toReview.length };
};
