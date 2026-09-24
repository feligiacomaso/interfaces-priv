const API = "https://vj.interfaces.jima.com.ar/api/v2";
const sections = [...document.querySelectorAll("section")];

const modal = document.createElement("dialog");
modal.className = "game-dialog";
modal.innerHTML =
    '<button class="dialog-close" aria-label="Cerrar"></button><img class="dialog-image" alt=""><div class="dialog-content"><small class="dialog-meta"></small><h2></h2><p class="dialog-description"></p><p class="dialog-platforms"></p></div>';
document.body.append(modal);

modal.querySelector(".dialog-close").onclick = () => modal.close();
modal.addEventListener("click", event => {
    if (event.target === modal) {
        modal.close();
    }
});

function openDetails(game) {
    const image = modal.querySelector(".dialog-image");
    image.src = game.background_image || game.background_image_low_res || "";
    image.hidden = !image.src;

    modal.querySelector("h2").textContent = game.name || "Juego sin título";
    modal.querySelector(".dialog-meta").textContent = [
        game.rating ? `★ ${game.rating}` : "Sin calificación",
        game.released || "Fecha desconocida",
        (game.genres || []).map(genre => genre.name).join(" · ")
    ].filter(Boolean).join("  ·  ");
    modal.querySelector(".dialog-description").textContent =
        game.description || "No hay descripción disponible.";
    modal.querySelector(".dialog-platforms").textContent =
        "Plataformas: " + ((game.platforms || []).map(platform => platform.name).join(", ") || "No informadas");

    modal.showModal();
}

function makeCard(game, large = false) {
    const card = document.createElement("article");
    card.className = "card";

    const art = document.createElement("div");
    art.className = "art";

    const src = large
        ? (game.background_image || game.background_image_low_res)
        : (game.background_image_low_res || game.background_image);

    if (src) {
        const image = document.createElement("img");
        image.className = "art-image";
        image.src = src;
        image.alt = "";
        image.loading = "lazy";
        image.onerror = () => image.remove();
        art.append(image);
    }

    const name = document.createElement("span");
    name.className = "art-name";
    name.textContent = game.name || "Juego sin título";
    art.append(name);

    const buy = document.createElement("button");
    buy.className = "purchase";
    buy.type = "button";
    buy.setAttribute("aria-label", `Comprar ${game.name || "juego"}`);
    buy.innerHTML = "<span>🛒</span><b>Comprar</b>";

    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("h3");
    title.textContent = game.name || "Juego sin título";

    const rating = document.createElement("span");
    rating.className = "card-rating";
    rating.textContent = game.rating ? `★ ${game.rating}` : "";

    info.append(title, rating);
    card.append(art, buy, info);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Ver detalles de ${game.name || "juego"}`);

    card.addEventListener("click", event => {
        if (!event.target.closest(".purchase")) {
            openDetails(game);
        }
    });

    card.addEventListener("keydown", event => {
        if (event.target === card && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openDetails(game);
        }
    });

    return card;
}

function setupCarousel(section, games, large = false) {
    const track = section.querySelector(".track");
    track.replaceChildren(...games.map(game => makeCard(game, large)));

    const [prev, next] = section.querySelectorAll(".arrow");
    const step = () => track.clientWidth * .85;

    next.onclick = () => track.scrollTo({
        left: track.scrollLeft + step() >= track.scrollWidth - track.clientWidth - 4
            ? 0
            : track.scrollLeft + step(),
        behavior: "smooth"
    });

    prev.onclick = () => track.scrollTo({
        left: track.scrollLeft <= 4
            ? track.scrollWidth
            : track.scrollLeft - step(),
        behavior: "smooth"
    });
}

function showMessage(message) {
    sections.forEach(section => {
        const track = section.querySelector(".track");
        const paragraph = document.createElement("p");
        paragraph.className = "api-message";
        paragraph.textContent = message;
        track.replaceChildren(paragraph);
    });
}

function dateValue(game) {
    return Date.parse(game.released) || 0;
}

fetch(API)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data) || !data.length) {
            throw new Error("La API no devolvió videojuegos.");
        }

        const valid = data.filter(game => game && game.name);
        const byRating = [...valid].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        const byDate = [...valid].sort((a, b) => dateValue(b) - dateValue(a));

        setupCarousel(sections[0], byRating.slice(0, 12), true);
        setupCarousel(sections[1], byRating.slice(0, 30));
        setupCarousel(sections[2], byDate.slice(0, 30));
        setupCarousel(
            sections[3],
            byRating.slice(30, 60).length ? byRating.slice(30, 60) : byRating.slice(0, 30)
        );
    })
    .catch(error => {
        console.error("Error al cargar la API v2:", error);
        showMessage("No se pudieron cargar los videojuegos. Revisá tu conexión e intentá de nuevo.");
    });


