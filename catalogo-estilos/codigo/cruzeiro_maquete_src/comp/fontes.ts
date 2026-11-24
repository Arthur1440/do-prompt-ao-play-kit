import { loadFont as spaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as alfaSlab } from "@remotion/google-fonts/AlfaSlabOne";
import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";

const sg = spaceGrotesk("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });
const as = alfaSlab("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const pf = playfair("normal", { weights: ["600", "900"], subsets: ["latin", "latin-ext"] });
const pfi = playfair("italic", { weights: ["600"], subsets: ["latin", "latin-ext"] });

export const F = { sg: sg.fontFamily, placa: as.fontFamily, jornal: pf.fontFamily };

let pronto: Promise<unknown> | null = null;
export const FONTES_PRONTAS = () =>
  (pronto ??= Promise.all([sg.waitUntilDone(), as.waitUntilDone(), pf.waitUntilDone(), pfi.waitUntilDone()]).then(() =>
    Promise.all([
      document.fonts.load(`700 100px ${sg.fontFamily}`),
      document.fonts.load(`400 100px ${as.fontFamily}`),
      document.fonts.load(`900 100px ${pf.fontFamily}`),
      document.fonts.load(`italic 600 30px ${pf.fontFamily}`),
    ]),
  ));
