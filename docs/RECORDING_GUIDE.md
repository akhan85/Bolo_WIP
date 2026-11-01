# Recording Urdu audio for Bolo

## Option A: generate it with AI voices (recommended to start)

Bolo can create every missing clip with Microsoft Azure's Pakistani Urdu neural voices (Uzma, female, and Asad, male). The whole course is only about 7,000 characters, well inside Azure's free tier (500,000 characters a month).

**One-time setup**
1. Sign in at https://portal.azure.com, then open **https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices** (skip the portal search; it can error).
2. Resource group: create `bolo`. Region: the closest one (for example East US). Name: `bolo-speech`. Pricing tier: **Free F0**. Then **Review + create → Create**.
3. **Go to resource → Keys and Endpoint.** Copy **KEY 1** and the **Location/Region** (for example `eastus`).
4. Paste them into `.env`:
   ```
   AZURE_SPEECH_KEY=your-key-here
   AZURE_SPEECH_REGION=eastus
   ```

> If the portal shows "Interaction required / AADSTS50058", your browser is blocking Microsoft's sign-in cookies. Click **Sign in again**, or use a private window, or use Chrome/Edge, or (in Safari) turn off "Prevent cross-site tracking" temporarily.

**Generate**
```bash
npm run audio:generate -- --sample
```
That creates 6 test clips in `audio-samples/`. Open them and listen. If they sound right:
```bash
npm run audio:generate
```
```bash
npm run db:prod
```
The first command creates every missing clip in `public/sound/` (it never overwrites existing files, so your own recordings are safe). The second loads the lessons with the new audio. Note that it resets learner progress.

You can also do it in batches: `npm run audio:generate -- --only "Start Here" --limit 20`.

**What the generator does for you:** it speaks about 10% slower than normal, reads single letters by their names (ب → "be"), and uses the male voice for male-speaker sentences (پیتا ہوں) and the female voice otherwise. A native speaker should still skim the **Start Here** clips: AI voices occasionally put stress in the wrong place.

**Reviewing and replacing AI clips:** every clip the AI made is listed in **[docs/assets/ai-audio-review.md](assets/ai-audio-review.md)**. When one doesn't sound right, record it yourself (Option B below) and save it over the AI file with the **same name**. The list notices the file has changed and marks it ✅ replaced. Refresh the list with `npm run assets:report`, and run `npm run db:prod` only if you've added clips that didn't exist before. Replacing an existing file needs no reseed: the lessons already point at that filename.

Known weak spots: the letter names ٹ (ṭe) and ت (te). The AI can't say "tay" quite right, so record those two first.

## Option B: record it yourself

Bolo plays a recording when a question appears (the 🔊 button in the speech bubble) and when a learner taps an Urdu answer. Every recording is optional. If a file is missing the app stays silent, but listening matters a lot for learning Urdu, so it's worth doing.

## 1. What to record

Open **[docs/assets/audio-todo.md](assets/audio-todo.md)**. It lists every missing file, split into three priorities:

**Start with the "Start Here" sections** at the top of each priority. Beginners learn those lessons by listening, so they benefit most from audio.

| Priority | What | Why first |
|---|---|---|
| 1 | Letters & single words | Short to record, and each one is reused across many questions |
| 2 | Short phrases & reading drills | Most common patterns |
| 3 | Full sentences & dialogue lines | Nice to have; record when you have time |

Each row gives you the Urdu to say, the romanized pronunciation, the meaning, and **the exact path to save the file to**.

> The list is generated from the curriculum. After you add recordings (or change lessons), refresh it with:
> ```bash
> npm run assets:report
> ```

## 2. Where to save files

All audio goes in **`public/sound/`**, using the file name from the list, for example:

```
Bolo_WIP/public/sound/larka.mp3        ← لڑکا
Bolo_WIP/public/sound/mujhe_aam_pasand_hai.mp3
```

- The name must match **exactly**: lowercase, with underscores, ending in `.mp3`.
- After adding files, **re-run the seed** so the lessons pick them up:
  ```bash
  npm run db:prod
  ```
  (Heads-up: this wipes learner progress. That's fine in development.)

## 3. How to record (iPhone or Mac, no special gear)

**Setup**
- Use a quiet room with soft furnishings; a closet full of clothes works well. Turn off fans and the AC.
- Hold the phone or mic about a hand's width (15–20 cm) from your mouth, slightly to the side so your breath doesn't "pop".
- Use the same room, distance and voice for every session so the clips sound consistent.

**Recording**
- iPhone: **Voice Memos** app. Settings → Voice Memos → Audio Quality → **Lossless**.
- Mac: **QuickTime Player** → File → New Audio Recording, or Voice Memos for Mac.
- Record a whole batch in one take: say each item **twice** with a 2-second pause between items. Then pick the better take of each while editing.

**How to say it**
- Speak **clearly and a little slower than normal**, like a friendly teacher, but keep the natural melody. Don't break words into syllables.
- **Single letters**: say the letter's *name* (ب → "be", ج → "jeem"), the way a teacher would in class.
- **Questions**: let the pitch rise naturally at the end.
- Be careful with the sounds learners struggle with. Exaggerate them slightly:
  - aspirated vs plain: پ / پھ, ت / تھ (a puff of air you can feel on your hand)
  - retroflex vs dental: ٹ / ت, ڈ / د (tongue curled back vs touching the teeth)
  - ق (deep in the throat) vs ک, and خ / غ

**Editing and exporting**
- Trim the silence so each file starts within about 0.1 s of the word and ends about 0.3 s after it.
- Keep each word in its own file.
- Export as **MP3** (mono, 44.1 kHz, 128 kbps is plenty). From Voice Memos, share as `.m4a` and convert with the free [Audacity](https://www.audacityteam.org/) (File → Export → MP3) or, if you have `ffmpeg` installed:
  ```bash
  ffmpeg -i input.m4a -ac 1 -ar 44100 -b:a 128k public/sound/larka.mp3
  ```
- Rename the file to match the list, then drop it into `public/sound/`.

## 4. Gender variants

Some Stage 2 sentences come in male and female versions (for example *میں چائے پیتا ہوں* / *میں چائے پیتی ہوں*). Ideally a man records the پیتا (male) version and a woman records the پیتی (female) version. If you're recording alone, still record both. The grammar is what matters.

## 5. Quick check

Start the app (`npm run dev`), open a lesson, and you should hear the word when a question appears. If a sound doesn't play:
1. Check the file name matches the list exactly.
2. Check you re-ran `npm run db:prod` after adding it.
3. Open `http://localhost:3000/sound/<name>.mp3` in the browser. If that 404s, the file is in the wrong folder.

## About the two existing files `_e.mp3` / `_he.mp3`

These were left over from an old naming bug (ٹ and ح both turned into `_e`). Nothing uses them any more. ٹ is now `tte.mp3` and ح is `hhe.mp3`, and both are on the to-do list. Listen to the old files: if one is a good ٹ or ح recording, rename it to the new name instead of re-recording.
