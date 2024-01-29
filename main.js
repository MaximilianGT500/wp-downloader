let express = require("express");
const app = express();

const Translation = require("./services/translation");
Translation.loadLanguages();

app.use(express.static("static"));

app.set("view engine", "pug");
app.set("views", "views");

const api = require("./routes/api");
const frontend = require("./routes/frontend");

app.use("/api", api);
app.use(frontend);

app.listen(3000, () => {
	console.info("App gestartet auf Port: 3000");
});