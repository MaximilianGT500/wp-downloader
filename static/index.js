(() => {
	"use strict";

	const I18N = window.__I18N__ || {};
	const qs = (selector, root = document) => root.querySelector(selector);

	/* ---------- Theme ---------- */

	const themeToggle = qs("#theme-toggle");

	function currentTheme() {
		return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
	}

	function applyTheme(theme) {
		document.documentElement.setAttribute("data-theme", theme);
		try {
			localStorage.setItem("theme", theme);
		} catch (e) { /* private mode */ }
		if (themeToggle) {
			const label = theme === "dark" ? I18N.theme?.switchToLight : I18N.theme?.switchToDark;
			if (label) themeToggle.setAttribute("aria-label", label);
		}
	}

	if (themeToggle) {
		applyTheme(currentTheme());
		themeToggle.addEventListener("click", () => applyTheme(currentTheme() === "dark" ? "light" : "dark"));
	}

	/* ---------- Mobile navigation ---------- */

	const menuToggle = qs("#menu-toggle");
	const nav = qs("#nav");

	if (menuToggle && nav) {
		menuToggle.addEventListener("click", () => {
			const open = nav.classList.toggle("open");
			menuToggle.setAttribute("aria-expanded", String(open));
		});
	}

	/* ---------- Search ---------- */

	const searchForm = qs("#searchform");

	if (searchForm) {
		const errorEl = qs("#error-result");
		const input = qs("#search-input");

		searchForm.addEventListener("submit", (event) => {
			event.preventDefault();

			const value = input.value.trim();
			const match = /\/?(?:(story)\/)?(\d+)/i.exec(value);

			if (!match || !match[2]) {
				errorEl.textContent = I18N.home?.invalidSearch || "";
				errorEl.hidden = false;
				errorEl.classList.remove("shake");
				void errorEl.offsetWidth; // restart animation
				errorEl.classList.add("shake");
				input.focus();
				return;
			}

			const isStory = match[1] === "story";
			window.location.href = isStory ? `b-${match[2]}` : match[2];
		});
	}

	/* ---------- Book description (show more / less) ---------- */

	const descriptionText = qs("#book-description-text");
	const descriptionToggle = qs("#description-toggle");

	if (descriptionText && descriptionToggle) {
		const update = () => {
			const clamped = descriptionText.scrollHeight > descriptionText.clientHeight + 4;
			descriptionToggle.hidden = !clamped;
			if (clamped) descriptionText.classList.add("clamped");
		};

		update();
		window.addEventListener("resize", update);

		descriptionToggle.addEventListener("click", () => {
			const collapsed = descriptionText.classList.toggle("clamped");
			descriptionToggle.textContent = collapsed
				? (I18N.book?.showMore || "More")
				: (I18N.book?.showLess || "Less");
		});
	}

	/* ---------- Downloads ---------- */

	const modal = qs("#loading-modal");
	const modalError = qs("#loading-error");

	function setModal(visible) {
		if (!modal) return;
		modal.hidden = !visible;
		if (modalError) modalError.hidden = true;
	}

	if (modal) {
		modal.addEventListener("click", (event) => {
			if (event.target === modal) setModal(false);
		});
	}

	function parseFilename(disposition) {
		if (!disposition) return null;

		const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
		if (utf8) {
			try {
				return decodeURIComponent(utf8[1]);
			} catch (e) { /* fall through */ }
		}

		const plain = /filename="?([^";]+)"?/i.exec(disposition);
		return plain ? plain[1] : null;
	}

	function showError(message) {
		if (!modalError) return;
		modalError.textContent = message;
		modalError.hidden = false;
	}

	async function downloadBook(id, format) {
		setModal(true);

		try {
			const response = await fetch(`/api/${id}/download/${format}`);

			if (!response.ok) {
				let message = I18N.book?.error || "Download failed.";
				try {
					const body = await response.json();
					if (body && body.error === "book_not_found" && I18N.errors?.bookNotFound) {
						message = I18N.errors.bookNotFound;
					}
				} catch (e) { /* non-JSON error body */ }
				showError(message);
				return;
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.download = parseFilename(response.headers.get("content-disposition")) || `book.${format}`;
			document.body.append(link);
			link.click();
			link.remove();

			setTimeout(() => URL.revokeObjectURL(url), 2000);
			setModal(false);
		} catch (err) {
			showError(I18N.book?.error || "Download failed.");
		}
	}

	document.querySelectorAll(".download-button").forEach((button) => {
		button.addEventListener("click", () => {
			downloadBook(button.dataset.bookId, button.dataset.bookFormat);
		});
	});

})();
