#!/usr/bin/env node
// Generate the MIRA-style mascot set with Nano Banana (gemini-2.5-flash-image).
// Base pose first, then every other pose FROM the base image for character consistency.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const OUT = join(ROOT, "public", "mascot");
mkdirSync(OUT, { recursive: true });

const KEY = readFileSync(join(ROOT, ".env.gemini"), "utf8")
  .split("\n").find((l) => l.startsWith("GEMINI_API_KEY="))
  .split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

const MODEL = "gemini-2.5-flash-image";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

const STYLE =
  "A cute friendly 3D-rendered robot mascot character. It wears a soft matte light-grey oversized hoodie with drawstrings, black shorts, and chunky white sneakers with lime-green accents. Its face is a smooth glossy dark-charcoal rounded-square visor with two bright glowing emerald-green vertical pill-shaped eyes. Small dark robotic hands. Pixar / high-end octane 3D product render, soft studio lighting, gentle ambient occlusion, very high detail, clean and adorable. Isolated on a fully transparent background, centered, full body, no text, no shadow floor.";

const POSES = [
  { name: "hero", prompt: "standing confidently in a relaxed three-quarter pose, looking forward, hands relaxed." },
  { name: "wave", prompt: "cheerfully waving one hand hello, friendly and welcoming." },
  { name: "laptop", prompt: "sitting cross-legged working on a modern laptop that glows soft green, focused." },
  { name: "xray", prompt: "holding up a chest x-ray film with both hands and examining it, curious." },
  { name: "point", prompt: "pointing upward at an imaginary floating chart, one arm raised, explaining." },
  { name: "thumbsup", prompt: "giving an enthusiastic thumbs up with a happy posture." },
  { name: "peek", prompt: "small and curious, peeking around a corner with just head and one hand visible." },
];

async function call(parts) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"] } }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code} ${json.error.message}`);
  const partsOut = json.candidates?.[0]?.content?.parts ?? [];
  const img = partsOut.find((p) => p.inlineData?.data);
  if (!img) throw new Error("no image in response: " + JSON.stringify(partsOut).slice(0, 200));
  return img.inlineData.data; // base64
}

async function main() {
  console.log("Generating base (hero) …");
  let baseB64;
  try {
    baseB64 = await call([{ text: `${STYLE} Pose: ${POSES[0].prompt}` }]);
    writeFileSync(join(OUT, "hero.png"), Buffer.from(baseB64, "base64"));
    console.log("  ✓ hero.png");
  } catch (e) {
    console.error("  ✗ base failed:", e.message);
    process.exit(1);
  }

  for (const pose of POSES.slice(1)) {
    process.stdout.write(`Generating ${pose.name} (from base) … `);
    try {
      const b64 = await call([
        { inlineData: { mimeType: "image/png", data: baseB64 } },
        { text: `Use the EXACT SAME robot character and art style as the reference image — identical colors, proportions, grey hoodie, dark visor, glowing emerald-green eyes. New pose: ${pose.prompt} Isolated on a fully transparent background, full body, no text.` },
      ]);
      writeFileSync(join(OUT, `${pose.name}.png`), Buffer.from(b64, "base64"));
      console.log("✓");
    } catch (e) {
      console.log("✗", e.message);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  console.log("Done →", OUT);
}

main();
