const express = require("express");
const router = express.Router();

const WP = require("../services/wp");
const Translation = require("../services/translation");
const logger = require("../services/logger");

function getTranslation(req) {
	return Translation.getTranslation(req.acceptsLanguages(Translation.langs));
}

const ERROR_KEYS = {
	book_not_found: "bookNotFound",
	403: "tokenError",
	404: "notFound",
	500: "serverError",
};

function renderError(req, res, code, status = 200) {
	const trans = getTranslation(req);
	const key = ERROR_KEYS[code] || "unknown";
	res.status(status).render("error", { ...trans, error: code, errorMessage: trans.lang.errors[key] });
}

router.get("/", (req, res) => {
	res.render("home", getTranslation(req));
});

router.get("/help", (req, res) => {
	res.render("help", getTranslation(req));
});

router.get("/error/:err", (req, res) => {
	renderError(req, res, req.params.err);
});

async function handleBookRoute(req, res) {

	const asBook = req.path.startsWith("/b-");
	const id = req.params.id;

	let book = null;

	if (asBook) {
		book = await WP.getBookById(id);
	} else {
		const byPart = await WP.getBookByPartId(id);
		book = byPart && byPart.group ? byPart.group : null;
	}

	if (!book) {
		return renderError(req, res, "book_not_found", 404);
	}

	const trans = getTranslation(req);

	const pubYear = book.lastPublishedPart?.createDate
		? new Date(book.lastPublishedPart.createDate).getFullYear()
		: null;

	res.render("book", { ...trans, book, pubYear });

}

// /b-<story-id>  →  story metadata
// /<part-id>     →  resolve via v4 API to the containing story
router.get(/^\/b-(?<id>\d+)$/, handleBookRoute);
router.get(/^\/(?<id>\d+)$/, handleBookRoute);

// /story/<id>-<slug>  or  /<id>-<slug>  →  canonical routes
router.get(/^\/(?:story\/)?\d+(?:-.*)?$/, (req, res) => {

	const match = req.path.match(/^\/(?:story\/)?(\d+)/);

	if (!match) return;

	const isStory = req.path.startsWith("/story/");
	res.redirect(301, isStory ? `/b-${match[1]}` : `/${match[1]}`);

});

// 404 page
router.use((req, res) => {
	renderError(req, res, "404", 404);
});

// 500 page
router.use((err, req, res, next) => {
	logger.error(err.stack || err.message || err);
	if (res.headersSent) return next(err);
	renderError(req, res, "500", 500);
});

module.exports = router;
