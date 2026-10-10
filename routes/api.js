const express = require("express");
const router = express.Router();

const WP = require("../services/wp");
const Generator = require("../services/generator");
const Translation = require("../services/translation");
const logger = require("../services/logger");

router.get("/health", (req, res) => {
	res.json({ status: "ok", uptime: Math.round(process.uptime()) });
});

router.get("/:id/download/:format", async (req, res) => {

	const { id, format } = req.params;

	if (!/^\d{1,12}$/.test(id)) {
		return res.status(400).json({ error: "invalid_id" });
	}

	if (!Generator.availableFormats.includes(format)) {
		logger.warn(`Unbekanntes Format angefordert: "${format}"`);
		return res.status(400).json({ error: "unknown_format", formats: Generator.availableFormats });
	}

	const book = await WP.getBookById(id);

	if (!book) {
		return res.status(404).json({ error: "book_not_found" });
	}

	const parts = await WP.getParts(book.parts || []);

	if (!parts.length) {
		return res.status(502).json({ error: "parts_unavailable" });
	}

	const { lang, langName } = Translation.getTranslation(req.acceptsLanguages(Translation.langs));
	const filename = `${WP.formatBookTitle(book.title)}-${book.id}.${format}`;

	if (format === "epub") {
		const epub = await Generator.epub(book, parts, lang, langName);
		res.attachment(filename).type("application/epub+zip").send(epub);
	} else {
		const html = await Generator.html(book, parts, lang, langName);
		res.attachment(filename).type("text/html; charset=utf-8").send(html);
	}

	logger.info(`Konvertiert: "${book.title}" (${id}) → ${format} (${parts.length}/${book.parts.length} Kapitel)`);

});

// API errors are answered as JSON
router.use((err, req, res, next) => {
	logger.error(err.stack || err.message || err);
	if (res.headersSent) return next(err);
	res.status(500).json({ error: "internal_server_error" });
});

module.exports = router;
