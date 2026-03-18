import { extractKeywords } from '../backend/src/modules/search/keyword-extractor';
console.log(JSON.stringify(extractKeywords('Хочу торт в Москве рядом'), null, 2));
