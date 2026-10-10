const path = require("path");
const express = require("express");

const Translation = require("./services/translation");
const logger = require("./services/logger");

const api = require("./routes/api");
const frontend = require("./routes/frontend");

const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

Translation.loadLanguages();

const app = express();

app.disable("x-powered-by");

// Basic security headers
app.use((req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "SAMEORIGIN");
	res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
	res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	res.setHeader(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; base-uri 'self'; form-action 'self'"
	);
	next();
});

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.set("view cache", process.env.NODE_ENV === "production");

app.use(express.static(path.join(__dirname, "static"), { maxAge: "1d" }));

app.use("/api", api);
app.use(frontend);

// Last-resort error handler (frontend/api routers have their own)
app.use((err, req, res, next) => {
	logger.error(err.stack || err.message || err);
	if (res.headersSent) return next(err);
	res.status(500).type("text/plain").send("Internal Server Error");
});

const server = app.listen(PORT, HOST, () => {
	logger.info(`WP Downloader läuft auf http://localhost:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => {
		logger.info(`${signal} empfangen – Server wird beendet.`);
		server.close(() => process.exit(0));
		setTimeout(() => process.exit(1), 10_000).unref();
	});
}
