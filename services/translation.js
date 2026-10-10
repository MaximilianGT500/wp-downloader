const fs = require("fs");
const path = require("path");

const LANG_DIR = path.join(__dirname, "..", "lang");
const DEFAULT_LANG = process.env.DEFAULT_LANG || "de";

class Translation {

	static langData = {};
	static langs = [];

	static loadLanguages() {

		for (const file of fs.readdirSync(LANG_DIR)) {
			if (!file.endsWith(".json")) continue;

			const langName = path.basename(file, ".json");
			Translation.langData[langName] = JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf8"));
			Translation.langs.push(langName);
		}

	}

	/**
	 * Resolves the best matching translation for a list of accepted languages
	 * (e.g. the result of req.acceptsLanguages). Falls back to DEFAULT_LANG.
	 */
	static getTranslation(accepted) {

		const acceptedList = Array.isArray(accepted) ? accepted : [accepted];

		for (const code of acceptedList) {
			if (typeof code !== "string" || !code) continue;

			const base = code.toLowerCase().split("-")[0];
			if (Translation.langData[base]) {
				return { lang: Translation.langData[base], langName: base };
			}
		}

		const fallback = Translation.langData[DEFAULT_LANG] ? DEFAULT_LANG : (Translation.langs[0] || "en");
		return { lang: Translation.langData[fallback], langName: fallback };

	}

}

module.exports = Translation;
