const express = require("express");
const router = express.Router();

const WP = require("../services/wp");
const Translation = require("../services/translation");

router.use((req, res, next) => {

	req.trans = Translation.getTranslation(req.acceptsLanguages(Translation.langs));

	next();

});

router.get("/", async (req, res) => {

	res.render("home", req.trans);

});

router.get("/help", (req, res) => {

	res.render("help", req.trans);

});

router.get("/error/:err", (req, res) => {
	res.render("error", { error: req.params.err, lang: req.trans.lang, langName: req.trans.langName });
});

router.get(/^\/((b)-)?(\d+)$/, async (req, res) => {

	let book;

	if(req.params[1] === "b") {
		book = await WP.getBookById(req.params[2]);
	} else {
		book = await WP.getBookByPartId(req.params[2]);
		book = book ? book.group : null;
	}

	if(book){
		res.render("book", { book, lang: req.trans.lang, langName: req.trans.langName });
	}else{
		res.render("error", { error: "book_not_found", lang: req.trans.lang, langName: req.trans.langName });
	}

});

router.get(/((story)\/)?(\d+)-?(.+)?/, async (req, res) => {
	res.redirect(`/${req.params[1] ? "b-" : ""}${req.params[2]}`);

});

module.exports = router;