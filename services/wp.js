const axios = require("axios");
const NodeCache = require("node-cache");
const sanitizeHtml = require("sanitize-html");

const logger = require("./logger");

const CACHE_TTL = Number.parseInt(process.env.CACHE_TTL, 10) || 24 * 60 * 60;
const TIMEOUT = Number.parseInt(process.env.REQUEST_TIMEOUT, 10) || 15_000;
const PART_CONCURRENCY = Number.parseInt(process.env.PART_CONCURRENCY, 10) || 5;
const PART_RETRIES = Number.parseInt(process.env.PART_RETRIES, 10) || 2;

const STORY_FIELDS = "id,title,description,url,cover,language(id,name),user(name,username,avatar),lastPublishedPart(createDate),parts(id,title,text_url),tags";

const http = axios.create({
	timeout: TIMEOUT,
	headers: {
		accept: "application/json",
		"user-agent": "wp-downloader/2.0 (https://github.com/MaximilianGT500/wp-downloader)",
	},
});

class WP {

	static cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: Math.floor(CACHE_TTL / 4) });

	static allowedTags = sanitizeHtml.defaults.allowedTags.filter((tag) => tag !== "u");

	/**
	 * Downloads an image and returns it as a base64 data URI (or null on failure).
	 */
	static async getImage(url) {

		try {
			const res = await axios.get(url, { responseType: "arraybuffer", timeout: TIMEOUT });
			if (!res.data || !res.data.byteLength) return null;

			const contentType = (res.headers["content-type"] || "image/jpeg").split(";")[0].trim();
			return `data:${contentType};base64,${Buffer.from(res.data).toString("base64")}`;
		} catch (err) {
			logger.warn(`Bild konnte nicht geladen werden: ${url}`);
			return null;
		}

	}

	/**
	 * Fetches story metadata by part id (Wattpad v4 API) and returns the group.
	 */
	static async getBookByPartId(id) {

		const key = "bookbypart." + id;

		if (WP.cache.has(key)) return WP.cache.get(key);

		try {
			const { data } = await http.get(`https://www.wattpad.com/v4/parts/${id}`, {
				params: { fields: STORY_FIELDS.replace(/^(.*)$/, "text_url,group($1)") },
			});

			WP.cache.set(key, data);
			return data;
		} catch (err) {
			logger.warn(`Kapitel ${id} konnte nicht abgerufen werden (${err.response?.status ?? err.message}).`);
			return null;
		}

	}

	/**
	 * Fetches story metadata by story id (Wattpad v3 API).
	 */
	static async getBookById(id) {

		const key = "book." + id;

		if (WP.cache.has(key)) return WP.cache.get(key);

		try {
			const { data } = await http.get(`https://www.wattpad.com/api/v3/stories/${id}`, {
				params: { fields: STORY_FIELDS },
			});

			WP.cache.set(key, data);
			return data;
		} catch (err) {
			logger.warn(`Story ${id} konnte nicht abgerufen werden (${err.response?.status ?? err.message}).`);
			return null;
		}

	}

	/**
	 * Fetches, sanitizes and caches the text of a single part.
	 */
	static async getPartText(part) {

		const key = "part." + part.id;

		const cached = WP.cache.get(key);
		if (cached) return { title: part.title, data: cached };

		for (let attempt = 1; attempt <= PART_RETRIES; attempt++) {
			try {
				const res = await axios.get(part.text_url.text, { timeout: TIMEOUT, responseType: "text" });

				const cleaned = sanitizeHtml(res.data, { allowedTags: WP.allowedTags });

				WP.cache.set(key, cleaned);
				return { title: part.title, data: cleaned };
			} catch (err) {
				if (attempt === PART_RETRIES) {
					logger.warn(`Kapitel "${part.title}" (${part.id}) konnte nicht geladen werden (${err.response?.status ?? err.message}).`);
					return null;
				}
				await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
			}
		}

		return null;

	}

	/**
	 * Fetches the text of all parts with limited concurrency.
	 * Failed parts are skipped instead of aborting the whole download.
	 */
	static async getParts(parts) {

		const results = new Array(parts.length);
		let cursor = 0;

		async function worker() {
			while (cursor < parts.length) {
				const index = cursor++;
				results[index] = await WP.getPartText(parts[index]);
			}
		}

		await Promise.all(
			Array.from({ length: Math.min(PART_CONCURRENCY, parts.length) }, worker)
		);

		return results.filter(Boolean);

	}

	static formatBookTitle(title) {

		if (!title) return "story";

		const slug = Array.from(title.matchAll(/[\p{L}\p{N}]+/gu), (match) => match[0].toLowerCase()).join("-");
		return slug.slice(0, 80) || "story";

	}

}

module.exports = WP;
