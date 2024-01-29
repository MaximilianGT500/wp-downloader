const pug = require("pug");
const fs = require("fs");
const JSZip = require("jszip");
const axios = require("axios");

const WP = require("./wp");

class Generator {

	static availableFormats = ["epub", "html"];

	static templates = {
		mimetype: fs.readFileSync("./templates/epub/mimetype").toString(),
		container: fs.readFileSync("./templates/epub/META-INF/container.xml").toString(),
		metadata: fs.readFileSync("./templates/epub/META-INF/metadata.xml.pug").toString(),
		mainCSS: fs.readFileSync("./templates/epub/OPS/css/main.css").toString(),
		titleCSS: fs.readFileSync("./templates/epub/OPS/css/title.css").toString(),
		cover: fs.readFileSync("./templates/epub/OPS/cover.xhtml").toString(),
		contentOPF: fs.readFileSync("./templates/epub/OPS/content.opf.pug").toString(),
		titleFile: fs.readFileSync("./templates/epub/OPS/title.xhtml.pug").toString(),
		toc: fs.readFileSync("./templates/epub/OPS/toc.ncx.pug").toString(),
		chapter: fs.readFileSync("./templates/epub/OPS/chapter.xhtml.pug").toString(),
		htmlv2: fs.readFileSync("./templates/htmlv2.pug").toString()
	}

	static async epub(book, parts) {

		let zip = new JSZip();

		zip.file("mimetype", Generator.templates.mimetype);

		let metaInf = zip.folder("META-INF");

		metaInf.file("container.xml", Generator.templates.container);
		let metadata = pug.render(Generator.templates.metadata, book);
		metaInf.file("metadata.xml", metadata);

		let ops = zip.folder("OPS");

		let css = ops.folder("css");
		css.file("main.css", Generator.templates.mainCSS);
		css.file("title.css", Generator.templates.titleCSS);

		let images = ops.folder("images");

		try{
			let res = await axios.get(book.cover, { responseType: "arraybuffer" });
			images.file("cover.jpg", Buffer.from(res.data));
		}catch (e) {
			return null;
		}

		ops.file("cover.xhtml", Generator.templates.cover);

		let contentOPF = pug.render(Generator.templates.contentOPF, book);
		ops.file("content.opf", contentOPF);

		let titleFile = pug.render(Generator.templates.titleFile, book);
		ops.file("title.xhtml", titleFile);

		let toc = pug.render(Generator.templates.toc, book);
		ops.file("toc.ncx", toc);

		for(let i = 0; i < parts.length; i++){
			let chapter = pug.render(Generator.templates.chapter, parts[i]);
			ops.file(`chapter${i}.xhtml`, chapter);
		}

		try {
			return await zip.generateAsync({ type: "arraybuffer" });
		} catch (e) {
			console.log("Generatorfehler:", e);
			return null;
		}

	}

	static async html(book, parts, langName, lang) {

		let image = await WP.getImage(book.cover);
		let avatar = await WP.getImage(book.user.avatar);

		let template = Generator.templates.htmlv2;

		return pug.render(template, { book, parts, image, avatar, langName, lang });

	}

}

module.exports = Generator;