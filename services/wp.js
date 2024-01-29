const axios = require("axios");
const NodeCache = require("node-cache");
const sanitizeHtml = require("sanitize-html");

let ttl = 86400;

let allowedTags = sanitizeHtml.defaults.allowedTags.filter((e) => e !== "u");

class WP {

	static cache = new NodeCache({ stdTTL: ttl });

	static async getImage(url){
		try{
			let res = await axios.get(url, { responseType: "arraybuffer" });

			return Buffer.from(res.data, "binary").toString("base64");

		}catch (e) {
			return null;
		}

	}

	static async getBookByPartId(id) {

		let key = "bookbypart." + id;

		if(WP.cache.has(key)) {
			return WP.cache.get(key);
		}

		try {

			let res = await axios.get(`https://www.wattpad.com/v4/parts/${id}?fields=text_url,group(id,title,description,url,cover,user(name,username,avatar),lastPublishedPart,parts(id,title,text_url),tags)`,
				{ headers: { accept: "application/json" }});

			WP.cache.set(key, res.data);

			return res.data;

		} catch (e) {
			return false;
		}

	}

	static async getBookById(id) {

		let key = "book." + id;

		if(WP.cache.has(key)) {
			return WP.cache.get(key);
		}

		try {

			let res = await axios.get(`https://www.wattpad.com/api/v3/stories/${id}?fields=id,title,description,url,cover,user(name,username,avatar),lastPublishedPart,parts(id,title,text_url),tags`,
				{ headers: { accept: "application/json" }});

			WP.cache.set(key, res.data);

			return res.data;

		} catch (e) {
			return false;
		}

	}

	static async tryGetBook(id){

		let book = await WP.getBookById(id);
		if(!book){
			book = await WP.getBookByPartId(id);
			book = book.group;
		}

		return book;

	}

	static formatBookTitle(title){

		return Array.from(title.matchAll(/[a-zA-Z0-9äöüß]+/ig), (el) => el[0].toLowerCase()).join("-");

	}

	static async getParts(parts) {

		let texts = [];

		for(let part of parts) {

			try {

				let key = "part." + part.id;
				let text = null;

				if(WP.cache.has(key)) {
					text = WP.cache.get(key);
				} else {
					text = await axios.get(part.text_url.text);

					text = sanitizeHtml(text.data, {
						allowedTags
					});

					WP.cache.set(key, text);
				}

				texts.push({
					title: part.title,
					data: text
				});

			} catch (e) {
				continue;
			}

		}

		return texts;

	}

}
module.exports = WP;