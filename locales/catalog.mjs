import { TEXTES } from './base.mjs';
import { EXTRA } from './extra.mjs';
import ja from './ja.mjs';
import zh from './zh.mjs';
import vi from './vi.mjs';
import es from './es.mjs';
import it from './it.mjs';
export const translations = {...Object.fromEntries(Object.entries(TEXTES).map(([code, text]) => [code, {...text, ui: EXTRA[code]}])), ja, zh, vi, es, it};
