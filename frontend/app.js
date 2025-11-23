let API_BASE_URL = "http://localhost:8080/api";
let themeMode = "system";

async function loadConfig() {
  try {
    const res = await fetch("./config.json");
    if (res.ok) {
      const cfg = await res.json();
      if (cfg && typeof cfg.API_BASE_URL === "string") API_BASE_URL = cfg.API_BASE_URL;
    }
  } catch (_) {}
}

function updateThemeIcon() {
  const sun = document.getElementById("iconSun");
  const moon = document.getElementById("iconMoon");
  const sys = document.getElementById("iconSystem");
  sun.classList.add("hidden");
  moon.classList.add("hidden");
  sys.classList.add("hidden");
  if (themeMode === "light") sun.classList.remove("hidden");
  else if (themeMode === "dark") moon.classList.remove("hidden");
  else sys.classList.remove("hidden");
}

function applyThemeClass() {
  const root = document.documentElement;
  if (themeMode === "system") {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) root.classList.add("dark"); else root.classList.remove("dark");
  } else if (themeMode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function setTheme(mode) {
  themeMode = mode;
  localStorage.setItem("shear-theme", mode);
  applyThemeClass();
  updateThemeIcon();
}

function initTheme() {
  const saved = localStorage.getItem("shear-theme");
  setTheme(saved || "system");
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (themeMode === "system") applyThemeClass();
    });
  }
}

function open(el) {
  el.classList.remove("hidden");
  el.classList.add("flex");
}

function close(el) {
  el.classList.add("hidden");
  el.classList.remove("flex");
}

function setupMarked() {
  marked.setOptions({
    gfm: true,
    breaks: true,
    highlight: function (code, lang) {
      try {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        }
        return hljs.highlightAuto(code).value;
      } catch (_) {
        return code;
      }
    },
  });
}

function renderMarkdown(src) {
  const html = marked.parse(src || "");
  return DOMPurify.sanitize(html);
}

async function main() {
  await loadConfig();
  initTheme();
  setupMarked();

  const themeToggle = document.getElementById("themeToggle");
  const themeMenu = document.getElementById("themeMenu");
  const themeLight = document.getElementById("themeLight");
  const themeDark = document.getElementById("themeDark");
  const themeSystem = document.getElementById("themeSystem");
  themeToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !themeMenu.classList.contains("hidden");
    if (open) themeMenu.classList.add("hidden"); else themeMenu.classList.remove("hidden");
  });
  document.addEventListener("click", () => themeMenu.classList.add("hidden"));
  themeLight.addEventListener("click", () => { setTheme("light"); themeMenu.classList.add("hidden"); });
  themeDark.addEventListener("click", () => { setTheme("dark"); themeMenu.classList.add("hidden"); });
  themeSystem.addEventListener("click", () => { setTheme("system"); themeMenu.classList.add("hidden"); });

  const createModal = document.getElementById("createModal");
  const viewModal = document.getElementById("viewModal");
  const hashDialog = document.getElementById("hashDialog");
  const toast = document.getElementById("toast");
  const toastInner = document.getElementById("toastInner");
  const toastMsg = document.getElementById("toastMsg");

  function showToast(msg) {
    toastMsg.textContent = msg || "复制成功";
    toastInner.classList.remove("hidden");
    // show
    toastInner.classList.remove("opacity-0", "-translate-y-2");
    toastInner.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
      // hide
      toastInner.classList.remove("opacity-100", "translate-y-0");
      toastInner.classList.add("opacity-0", "-translate-y-2");
      setTimeout(() => {
        toastInner.classList.add("hidden");
      }, 300);
    }, 1500);
  }

  document.getElementById("openCreate").addEventListener("click", () => open(createModal));
  document.getElementById("closeCreate").addEventListener("click", () => close(createModal));

  document.getElementById("openView").addEventListener("click", () => open(viewModal));
  document.getElementById("closeView").addEventListener("click", () => close(viewModal));

  const mdInput = document.getElementById("mdInput");

  document.getElementById("saveBtn").addEventListener("click", async () => {
    const content = mdInput.value || "";
    try {
      const res = await fetch(`${API_BASE_URL}/clipboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        alert("保存失败");
        return;
      }
      const data = await res.json();
      document.getElementById("hashValue").textContent = data.hash;
      open(hashDialog);
    } catch (_) {
      alert("网络错误");
    }
  });

  document.getElementById("copyHash").addEventListener("click", async () => {
    const v = document.getElementById("hashValue").textContent;
    try {
      await navigator.clipboard.writeText(v);
      showToast("复制成功");
    } catch (_) {}
  });
  document.getElementById("confirmHash").addEventListener("click", () => close(hashDialog));

  const hashInput = document.getElementById("hashInput");
  const fetchBtn = document.getElementById("fetchBtn");
  const viewMode = document.getElementById("viewMode");
  const viewer = document.getElementById("viewer");
  const viewerRaw = document.getElementById("viewerRaw");
  const viewerRendered = document.getElementById("viewerRendered");
  let fetched = "";

  function applyViewMode() {
    const mode = viewMode.value;
    if (mode === "raw") {
      viewer.classList.remove("md:grid-cols-2");
      viewer.classList.add("grid-cols-1");
      viewerRaw.classList.remove("hidden");
      viewerRendered.classList.add("hidden");
      viewerRaw.textContent = fetched;
    } else if (mode === "split") {
      viewer.classList.remove("grid-cols-1");
      viewer.classList.add("md:grid-cols-2");
      viewerRaw.classList.remove("hidden");
      viewerRendered.classList.remove("hidden");
      viewerRaw.textContent = fetched;
      viewerRendered.innerHTML = renderMarkdown(fetched);
      try {
        renderMathInElement(viewerRendered, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true },
          ],
        });
      } catch (_) {}
    } else {
      viewer.classList.remove("md:grid-cols-2");
      viewer.classList.add("grid-cols-1");
      viewerRaw.classList.add("hidden");
      viewerRendered.classList.remove("hidden");
      viewerRendered.innerHTML = renderMarkdown(fetched);
      try {
        renderMathInElement(viewerRendered, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true },
          ],
        });
      } catch (_) {}
    }
  }

  viewMode.addEventListener("change", applyViewMode);

  fetchBtn.addEventListener("click", async () => {
    const h = (hashInput.value || "").trim();
    if (!/^[a-f0-9]{64}$/i.test(h)) {
      alert("Hash 格式不正确");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/clipboards/${h}`);
      if (!res.ok) {
        alert("未找到内容");
        return;
      }
      const data = await res.json();
      fetched = data.content || "";
      applyViewMode();
    } catch (_) {
      alert("网络错误");
    }
  });

  document.getElementById("copyRaw").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(fetched || "");
      showToast("复制成功");
    } catch (_) {}
  });
  document.getElementById("closeViewer").addEventListener("click", () => close(viewModal));

  document.getElementById("openCreate").addEventListener("click", () => {
    open(createModal);
  });
}

main();