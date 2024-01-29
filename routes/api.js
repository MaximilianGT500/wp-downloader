const express = require("express");
const router = express.Router();
const stream = require("stream");

const WP = require("../services/wp");
const Generator = require("../services/generator");
const Translation = require("../services/translation");

router.get("/:id/download/:format", async (req, res) => {

    if (!Generator.availableFormats.includes(req.params.format)) {
        res.status(400).send({ error: "unknown_format", formats: Generator.availableFormats });
        console.log(`[${new Date().toISOString()}] Konverter: Benutzer hat versucht, die Story in "${req.params.format}" umzuwandeln`);
        return;
    }

    let bookData = await WP.getBookById(req.params.id);

    if (!bookData) {
        res.status(404).send({ error: "book_not_found" });
        return;
    }

    let parts = await WP.getParts(bookData.parts);

    let { lang, langName } = Translation.getTranslation(req.acceptsLanguages(Translation.langs));

    if (req.params.format === "epub") {
        let epub;
        try {
            epub = await Generator.epub(bookData, parts);
        } catch (e) {
            console.error(e);
            return res.status(500).end();
        }

        let fileContents = Buffer.from(epub, "base64");
        let readStream = new stream.PassThrough();
        readStream.end(fileContents);

        res.set("Content-disposition", "attachment; filename=" + `${WP.formatBookTitle(bookData.title)}-${bookData.id}.epub`);
        res.set("Content-Type", "application/epub+zip");

        readStream.pipe(res);

    } else if (req.params.format === "html") {
        let html;
        try {
            html = await Generator.html(bookData, parts, langName, lang);
        } catch (e) {
            console.error(e);
            return res.status(500).end();
        }

        res.set("Content-disposition", "attachment; filename=" + `${WP.formatBookTitle(bookData.title)}-${bookData.id}.html`);
        res.set("Content-Type", "text/html");

        res.send(html);
    }

    console.log(`[${new Date().toISOString()}] Umgewandelt: "${bookData.title}" (${req.params.id}) zu ${req.params.format} (${parts.length}/${bookData.parts.length} parts)`);
});

module.exports = router;