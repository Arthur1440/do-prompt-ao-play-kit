import { loadFont as mono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as grot } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as serif } from "@remotion/google-fonts/DMSerifDisplay";

const fM = mono("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] });
const fG = grot("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext"] });
const fS = serif("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
export const MONO = fM.fontFamily;
export const FONTE = fG.fontFamily;
export const SERIF = fS.fontFamily;

let p: Promise<unknown> | null = null;
/** espera as fontes (o canvas das placas usa Space Grotesk) */
export function fontesProntas() {
  if (!p)
    p = Promise.all([fM.waitUntilDone(), fG.waitUntilDone(), fS.waitUntilDone()]).then(async () => {
      for (const fam of [MONO, FONTE, SERIF, "Space Grotesk"]) {
        for (const peso of ["400", "500", "700"]) {
          try {
            await document.fonts.load(`${peso} 40px ${fam}`);
          } catch {
            /* ok */
          }
        }
      }
      await document.fonts.ready;
    });
  return p;
}
