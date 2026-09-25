const API = "https://vj.interfaces.jima.com.ar/api/v2";
const sections = [...document.querySelectorAll("section")];
const knownFreeGames = new Set([
    "apex legends", "albion online", "brawlhalla", "counter-strike 2", "counter strike 2",
    "destiny 2", "dota 2", "fall guys", "fortnite", "genshin impact", "guild wars 2",
    "honkai: star rail", "league of legends", "marvel rivals", "overwatch 2", "palia",
    "path of exile", "pubg: battlegrounds", "pubg battlegrounds", "rocket league",
    "runescape", "team fortress 2", "the sims 4", "valorant", "warframe",
    "world of tanks", "world of warships", "zenless zone zero"
]);
const knownPaidGames = new Set(["grand theft auto v", "grand theft auto 5"]);

function isFreeToPlay(game) {
    const freeValue = game.is_free ?? game.isFree ?? game.free_to_play;
    if (typeof freeValue === "boolean") return freeValue;
    if (typeof freeValue === "string" && /^(true|free|gratis)$/i.test(freeValue.trim())) return true;
    if (typeof freeValue === "string" && /^(false|paid|premium)$/i.test(freeValue.trim())) return false;
    const price = game.price ?? game.min_price ?? game.store_price;
    if (typeof price === "number") return price === 0;
    if (typeof price === "string" && price.trim()) {
        if (/^(free|gratis|0([,.]0{1,2})?\s*(\$|usd|ars)?|\$\s*0([,.]0{1,2})?)$/i.test(price.trim())) return true;
        if (/\d/.test(price)) return false;
    }
    const name = (game.name || "").trim().toLowerCase();
    if (knownPaidGames.has(name)) return false;
    if (knownFreeGames.has(name)) return true;
    return game._fallbackFree === true;
}

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
        image.loading = large ? "eager" : "lazy";
        image.onerror = () => image.remove();
        art.append(image);
    }

    const name = document.createElement("span");
    name.className = "art-name";
    name.textContent = game.name || "Juego sin título";
    art.append(name);
    const freeToPlay = isFreeToPlay(game);
    card.classList.add(freeToPlay ? "is-free" : "is-paid");
    const action = document.createElement("button");
    action.className = large ? `hero-action ${freeToPlay ? "is-free" : "is-paid"}` : `game-action ${freeToPlay ? "is-free" : "is-paid"}`;
    action.type = "button";
    action.setAttribute("aria-label", `${freeToPlay ? "Jugar" : "Comprar"} ${game.name || "juego"}`);
    action.innerHTML = freeToPlay
        ? '<b>Jugar</b><span aria-hidden="true">▶</span>'
        : '<b>Comprar</b><span aria-hidden="true">🛒</span>';

    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("h3");
    title.textContent = game.name || "Juego sin título";

    const rating = document.createElement("span");
    rating.className = "card-rating";
    rating.textContent = game.rating ? `★ ${game.rating}` : "";

    info.append(title, rating);

    if (large) {
        art.append(action);
        card.append(art);
    } else {
        card.append(art, action, info);
    }
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Ver detalles de ${game.name || "juego"}`);

    const activateCard = () => {
        if (large && !card.classList.contains("is-active")) {
            if (card.promote) card.promote();
            else card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        } else {
            openDetails(game);
        }
    };

    card.addEventListener("click", activateCard);

    card.addEventListener("keydown", event => {
        if (event.target === card && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            activateCard();
        }
    });

    return card;
}

function setupCarousel(section, games, large = false) {
    const track = section.querySelector(".track");
    const cards = games.map((game, index) => {
        const card = makeCard(game, large);
        card.dataset.index = index;
        return card;
    });
    track.replaceChildren(...cards);
    const [prev, next] = section.querySelectorAll(".arrow");
    if (large) {
        let activeIndex = 0;
        const update = () => cards.forEach((card, index) => {
            const offset = (index - activeIndex + cards.length) % cards.length;
            card.classList.toggle("is-active", offset === 0);
            card.classList.toggle("side-right", offset === 1);
            card.classList.toggle("side-left", offset === cards.length - 1);
        });
        cards.forEach(card => {
            card.promote = () => {
                activeIndex = Number(card.dataset.index);
                update();
            };
        });
        prev.onclick = () => { activeIndex = (activeIndex - 1 + cards.length) % cards.length; update(); };
        next.onclick = () => { activeIndex = (activeIndex + 1) % cards.length; update(); };
        update();
    } else {
        const step = () => track.clientWidth * .85;
        next.onclick = () => track.scrollTo({
            left: track.scrollLeft + step() >= track.scrollWidth - track.clientWidth - 4
                ? 0 : track.scrollLeft + step(), behavior: "smooth"
        });
        prev.onclick = () => track.scrollTo({
            left: track.scrollLeft <= 4 ? track.scrollWidth : track.scrollLeft - step(),
            behavior: "smooth"
        });
    }
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
        byRating.forEach((game, index) => { game._fallbackFree = index % 3 === 1; });

        setupCarousel(sections[0], byRating.slice(0, 3), true);
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
