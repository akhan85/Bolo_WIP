# Recording Urdu audio for Bolo

Bolo plays a recording when a question appears (the 🔊 button in the speech bubble) and when a learner taps an Urdu answer. Every recording is optional. If a file is missing the app stays silent, but listening matters a lot for learning Urdu, so it's worth doing.

## 1. What to record

Open **[docs/assets/audio-todo.md](assets/audio-todo.md)**. It lists every missing file, split into three priorities:

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
