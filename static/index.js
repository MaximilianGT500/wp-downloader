function toggleMobileNav(event) {
    event.preventDefault();
    document.querySelector("#nav").classList.toggle("active");
}

let searchform = document.querySelector("#searchform");

if (searchform) {
    searchform.addEventListener("submit", (event) => {
        event.preventDefault();
        let url = event.target[0].value;
        let id = /\/?((story)\/)?(\d+)/i.exec(url);

        if (id && id[3]) {
            if (id[2] === "story") {
                window.location.href = window.location.href + "b-" + id[3];
            } else {
                window.location.href = window.location.href + id[3];
            }
        } else {
            document.querySelector("#error-result").innerHTML =
                "Dein eingegebener Wert kann nicht gefunden werden.<br/> Bitte gebe einen Link zu einer Story oder einer ID an.";
            setTimeout(() => {
                document.querySelector("#error-result").innerHTML = "";
            }, 5000);
        }
    });
}

function download(id, type) {
    axios({
        url: `${window.location.origin}/api/${id}/download/${type}`,
        method: "GET",
        responseType: "blob",
    })
        .then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            let filename = /filename=(.+)/i.exec(
                response.headers["content-disposition"]
            );

            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                filename[1] ? filename[1] : "book." + type
            );

            document.body.appendChild(link);
            link.click();

            document.querySelector("#loading-modal").classList.toggle("active");
        })
        .catch((e) => {
            document.querySelector("#loading-modal").classList.toggle("active");
            window.location.href =
                window.location.origin + "/error/" + e.response.status;
        });
}

let downloadParams = null;

document
    .querySelectorAll(".download-button")
    .forEach((button) => {
        button.addEventListener("click", (event) => {
            downloadParams = event.target.dataset;
            document.querySelector("#loading-modal").classList.toggle("active");
            download(downloadParams.bookId, downloadParams.bookFormat);
        });
    });