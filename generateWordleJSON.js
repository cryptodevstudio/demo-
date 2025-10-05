// generateWordleJSON.js
import fs from "fs";
import wordlist from "wordlist-english";

const words = wordlist["english/10"]
  .map(w => w.toUpperCase())
  .filter(w => w.length === 5 && /^[A-Z]+$/.test(w));

const outputPath = "./frontend/src/assets/wordleWords.json";

fs.writeFileSync(outputPath, JSON.stringify(words, null, 2), "utf-8");

console.log(`✅ Wordle JSON generated at: ${outputPath}`);
console.log(`Total words: ${words.length}`);
