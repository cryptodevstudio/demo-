// scrapeWordle.js
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

const URL = "https://www.wordunscrambler.net/word-list/wordle-word-list";

async function scrapeWordleWords() {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    let words = [];
    $("li").each((_, el) => {
      const word = $(el).text().trim().toUpperCase();
      if (word && /^[A-Z]{5}$/.test(word)) {
        words.push(word);
      }
    });

    // Remove duplicates
    words = [...new Set(words)];

    // Sort alphabetically (optional)
    words.sort();

    fs.writeFileSync("wordleWords.json", JSON.stringify(words, null, 2));
    console.log(`✅ Saved ${words.length} words to wordleWords.json`);
  } catch (err) {
    console.error("❌ Error scraping:", err.message);
  }
}

scrapeWordleWords();
