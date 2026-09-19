document.documentElement.classList.add("motion-ready");

const header = document.querySelector("[data-header]");
const progress = document.querySelector("[data-progress]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function updateScrollUI() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const amount = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;

  header?.classList.toggle("is-scrolled", window.scrollY > 28);
  if (progress) progress.style.transform = `scaleX(${amount})`;
}

updateScrollUI();
window.addEventListener("scroll", updateScrollUI, { passive: true });

const reveals = document.querySelectorAll(".reveal:not(.is-visible)");
if (reduceMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
  );
  reveals.forEach((element) => revealObserver.observe(element));
}

const navLinks = document.querySelectorAll("[data-nav]");
const sections = document.querySelectorAll("[data-section]");
if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;

      navLinks.forEach((link) => {
        const matches = link.getAttribute("href") === `#${current.target.id}`;
        link.classList.toggle("is-active", matches);
        if (matches) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.2, 0.6] },
  );
  sections.forEach((section) => sectionObserver.observe(section));
}

function closeMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Open navigation");
  mobileMenu?.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

menuToggle?.addEventListener("click", () => {
  const shouldOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(shouldOpen));
  menuToggle.setAttribute("aria-label", shouldOpen ? "Close navigation" : "Open navigation");
  mobileMenu?.classList.toggle("is-open", shouldOpen);
  document.body.classList.toggle("menu-open", shouldOpen);
});

mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

window.matchMedia("(min-width: 1101px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

const network = document.querySelector("[data-network]");
const packets = network ? [...network.querySelectorAll(".network-packet")] : [];
let networkFrame = 0;
let networkRunning = false;
let networkStart = performance.now();

function placeNetworkPackets(now) {
  if (!networkRunning) return;

  packets.forEach((packet) => {
    const route = document.getElementById(packet.dataset.route);
    if (!route || typeof route.getTotalLength !== "function") return;

    const duration = Number(packet.dataset.duration) || 3200;
    const delay = Number(packet.dataset.delay) || 0;
    const progress = ((now - networkStart + delay) % duration) / duration;
    const point = route.getPointAtLength(route.getTotalLength() * progress);
    const fade = Math.min(progress * 8, (1 - progress) * 8, 1);

    packet.setAttribute("transform", `translate(${point.x} ${point.y})`);
    packet.style.opacity = String(Math.max(0, fade));
  });

  networkFrame = requestAnimationFrame(placeNetworkPackets);
}

function setNetworkRunning(shouldRun) {
  if (!network || reduceMotion || shouldRun === networkRunning) return;
  networkRunning = shouldRun;
  network.classList.toggle("is-online", shouldRun);

  if (shouldRun) {
    networkStart = performance.now();
    networkFrame = requestAnimationFrame(placeNetworkPackets);
  } else {
    cancelAnimationFrame(networkFrame);
  }
}

if (network) {
  if (reduceMotion) {
    network.classList.add("is-online");
  } else if (!("IntersectionObserver" in window)) {
    setNetworkRunning(true);
  } else {
    const networkObserver = new IntersectionObserver(
      ([entry]) => setNetworkRunning(entry.isIntersecting && !document.hidden),
      { threshold: 0.16 },
    );
    networkObserver.observe(network);

    document.addEventListener("visibilitychange", () => {
      setNetworkRunning(!document.hidden && network.getBoundingClientRect().top < window.innerHeight && network.getBoundingClientRect().bottom > 0);
    });
  }
}
