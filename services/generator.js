const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const pug = require("pug");
const JSZip = require("jszip");
const axios = require("axios");

const WP = require("./wp");
const logger = require("./logger");

const TEMPLATE_DIR = path.join(__dirname, "..", "templates");
const EPUB_DIR = path.join(TEMPLATE_DIR, "epub");

const read = (file) => fs.readFileSync(path.join(TEMPLATE_DIR, file), "utf8");

class Generator {

	static availableFormats = ["epub", "html"];

	static templates = {
		mimetype: read("epub/mimetype"),
		container: read("epub/META-INF/container.xml"),
		metadata: read("epub/META-INF/metadata.xml.pug"),
		mainCSS: read("epub/OPS/css/main.css"),
		titleCSS: read("epub/OPS/css/title.css"),
		cover: read("epub/OPS/cover.xhtml.pug"),
		contentOPF: read("epub/OPS/content.opf.pug"),
		titleFile: read("epub/OPS/title.xhtml.pug"),
		toc: read("epub/OPS/toc.ncx.pug"),
		chapter: read("epub/OPS/chapter.xhtml.pug"),
		htmlReader: read("html-reader.pug"),
	};

	/**
	 * Downloads the story cover. Falls back to a bundled placeholder image
	 * instead of failing the whole conversion.
	 */
	static async fetchCover(url) {

		try {
			const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15_000 });
			const contentType = (res.headers["content-type"] || "").split(";")[0].trim().toLowerCase();

			if (contentType === "image/jpeg") {
				return { buffer: Buffer.from(res.data), file: "cover.jpg", mediaType: "image/jpeg" };
			}
			if (contentType === "image/png") {
				return { buffer: Buffer.from(res.data), file: "cover.png", mediaType: "image/png" };
			}

			throw new Error(`Nicht unterstütztes Cover-Format: ${contentType || "unbekannt"}`);
		} catch (err) {
			logger.warn("Cover konnte nicht geladen werden – Platzhalter wird verwendet.");
			return {
				buffer: fs.readFileSync(path.join(EPUB_DIR, "OPS", "images", "placeholder.jpg")),
				file: "placeholder.jpg",
				mediaType: "image/jpeg",
			};
		}

	}

	static async epub(book, parts, lang, langName) {

		const cover = await Generator.fetchCover(book.cover);

		const data = {
			...book,
			coverFile: cover.file,
			coverMediaType: cover.mediaType,
			langCode: langName,
			published: book.lastPublishedPart?.createDate ?? new Date().toISOString(),
			modified: new Date().toISOString(),
			uuid: crypto.randomUUID(),
			titlePageLabel: lang.book.titlePage,
			publishedLabel: lang.book.pubDate,
		};

		const zip = new JSZip();

		// The mimetype must be the first entry and stored without compression.
		zip.file("mimetype", Generator.templates.mimetype, { compression: "STORE" });

		const metaInf = zip.folder("META-INF");
		metaInf.file("container.xml", Generator.templates.container);
		metaInf.file("metadata.xml", pug.render(Generator.templates.metadata, data));

		const ops = zip.folder("OPS");

		const css = ops.folder("css");
		css.file("main.css", Generator.templates.mainCSS);
		css.file("title.css", Generator.templates.titleCSS);

		const images = ops.folder("images");
		images.file(cover.file, cover.buffer);

		ops.file("cover.xhtml", pug.render(Generator.templates.cover, data));
		ops.file("content.opf", pug.render(Generator.templates.contentOPF, { ...data, parts }));
		ops.file("title.xhtml", pug.render(Generator.templates.titleFile, data));
		ops.file("toc.ncx", pug.render(Generator.templates.toc, { ...data, parts }));

		for (let i = 0; i < parts.length; i++) {
			ops.file(`chapter${i}.xhtml`, pug.render(Generator.templates.chapter, { ...parts[i], langCode: langName }));
		}

		return zip.generateAsync({ type: "nodebuffer" });

	}

	static async html(book, parts, lang, langName) {

		const image = await WP.getImage(book.cover);
		const avatar = await WP.getImage(book.user.avatar);

		return pug.render(Generator.templates.htmlReader, { book, parts, image, avatar, lang, langName });

	}

}

module.exports = Generator;
