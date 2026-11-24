import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as mono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as grot } from "@remotion/google-fonts/SpaceGrotesk";

const fB = bebas("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const fM = mono("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] });
const fG = grot("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext"] });
export const TITULO = fB.fontFamily;
export const MONO = fM.fontFamily;
export const FONTE = fG.fontFamily;

let p: Promise<unknown> | null = null;
/** espera as fontes carregarem (as texturas em canvas usam Bebas, Space Grotesk e JetBrains Mono) */
export function fontesProntas() {
  if (!p)
    p = Promise.all([fB.waitUntilDone(), fM.waitUntilDone(), fG.waitUntilDone()]).then(async () => {
      // aliases com os nomes usados no canvas
      const pares: [string, string][] = [["Bebas Neue", TITULO], ["JetBrains Mono", MONO], ["Space Grotesk", FONTE]];
      for (const [nome, fam] of pares) {
        for (const peso of ["400", "500", "600", "700"]) {
          try {
            await document.fonts.load(`${peso} 40px ${fam}`);
          } catch {
            /* ok */
          }
        }
        void nome;
      }
      await document.fonts.ready;
    });
  return p;
}
