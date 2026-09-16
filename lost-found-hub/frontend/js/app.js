/* =========================================================
   Lost & Found Hub — main app logic
   ========================================================= */
(function () {
  "use strict";

  // ---------- State ----------
  const state = {
    items: [],
    search: "",
    status: "All",
    category: "All",
    sort: "newest",
    searchDebounce: null,
  };

  // ---------- DOM refs ----------
  const grid = document.getElementById("itemsGrid");
  const skeletonGrid = document.getElementById("skeletonGrid");
  const emptyState = document.getElementById("emptyState");
  const resultsCount = document.getElementById("resultsCount");
  const searchInput = document.getElementById("searchInput");
  const heroSearchInput = document.getElementById("heroSearchInput");
  const heroSearchForm = document.getElementById("heroSearchForm");
  const sortSelect = document.getElementById("sortSelect");
  const statusChips = document.getElementById("statusChips");
  const categoryChips = document.getElementById("categoryChips");

  // ---------- Utilities ----------
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function categoryIcon(size = 28) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="5" y="9" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M10 9V7a4 4 0 0 1 8 0v2" stroke="currentColor" stroke-width="1.4"/></svg>`;
  }

  /**
   * Builds the markup for an item image.
   * The placeholder icon is ALWAYS rendered underneath; the <img> is layered on
   * top of it. If the image fails to load it simply removes itself and the icon
   * shows through. This avoids injecting SVG markup (which contains double
   * quotes) into an onerror="" attribute, which used to break the HTML parser
   * and leak a stray  "/>  onto the card.
   */
  function mediaMarkup(item, size = 28) {
    const fallback = `<span class="media__fallback">${categoryIcon(size)}</span>`;
    if (!item.imageUrl) return fallback;
    return `${fallback}<img class="media__img" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" onerror="this.remove()"/>`;
  }

  // ---------- Toasts ----------
  const toastStack = document.getElementById("toastStack");
  function showToast(message, type = "info") {
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }
  window.showToast = showToast;

  // ---------- Fetch + render items ----------
  let loadToken = 0;

  async function loadItems() {
    const myToken = ++loadToken;
    skeletonGrid.style.display = "grid";
    grid.style.display = "none";
    emptyState.hidden = true;

    try {
      const params = {
        search: state.search,
        status: state.status,
        category: state.category,
        sort: state.sort,
      };
      const res = await Api.getItems(params);
      if (myToken !== loadToken) return; // a newer request superseded this one

      state.items = res.data;
      renderItems();
      resultsCount.innerHTML = `<strong>${res.total}</strong> item${res.total === 1 ? "" : "s"} on the board`;
      updatePinCard(res.data[0]);
    } catch (err) {
      if (myToken !== loadToken) return;
      showToast(err.message || "Couldn't load items. Is the server running?", "error");
      resultsCount.textContent = "Couldn't load items right now.";
    } finally {
      if (myToken === loadToken) {
        skeletonGrid.style.display = "none";
        grid.style.display = "grid";
      }
    }
  }

  function renderItems() {
    grid.innerHTML = "";
    if (!state.items.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();
    state.items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.dataset.id = item._id;

      card.innerHTML = `
        <div class="item-card__media">
          ${mediaMarkup(item, 28)}
          <span class="badge badge--${item.status}">${item.status}</span>
        </div>
        <div class="item-card__body">
          <span class="item-card__cat">${escapeHtml(item.category)}</span>
          <h3 class="item-card__title">${escapeHtml(item.title)}</h3>
          <p class="item-card__desc">${escapeHtml(item.description)}</p>
          <div class="item-card__meta">
            <span>${escapeHtml(item.location)}</span>
            <span>${formatDate(item.date)}</span>
          </div>
        </div>
      `;
      card.addEventListener("click", () => openDetailsModal(item._id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetailsModal(item._id); }
      });
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  function updatePinCard(latest) {
    const titleEl = document.getElementById("pinLatestTitle");
    const metaEl = document.getElementById("pinLatestMeta");
    if (!latest) {
      titleEl.textContent = "No items reported yet";
      metaEl.textContent = "Be the first to report something.";
      return;
    }
    titleEl.textContent = `${latest.status}: ${latest.title}`;
    metaEl.textContent = `${latest.location} · ${timeAgo(latest.createdAt || latest.date)}`;
  }

  async function loadStats() {
    try {
      const res = await Api.getStats();
      const { lost, found, claimed, total } = res.data;
      document.getElementById("statLost").textContent = lost;
      document.getElementById("statFound").textContent = found;
      document.getElementById("statClaimed").textContent = claimed;
      document.getElementById("bigStatTotal").textContent = total;
      document.getElementById("bigStatLost").textContent = lost;
      document.getElementById("bigStatFound").textContent = found;
      document.getElementById("bigStatClaimed").textContent = claimed;
    } catch (err) {
      // Fail silently for stats — non-critical UI
      console.warn("Stats failed to load:", err.message);
    }
  }

  // ---------- Filters & search ----------
  function setActiveChip(container, selector, value) {
    container.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("chip--active", chip.dataset[selector] === value);
    });
  }

  statusChips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    state.status = btn.dataset.status;
    setActiveChip(statusChips, "status", state.status);
    loadItems();
  });

  categoryChips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    state.category = btn.dataset.category;
    setActiveChip(categoryChips, "category", state.category);
    loadItems();
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    loadItems();
  });

  function debouncedSearch(value) {
    state.search = value;
    clearTimeout(state.searchDebounce);
    state.searchDebounce = setTimeout(loadItems, 350);
  }

  searchInput.addEventListener("input", (e) => {
    heroSearchInput.value = e.target.value;
    debouncedSearch(e.target.value);
  });

  heroSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    searchInput.value = heroSearchInput.value;
    state.search = heroSearchInput.value;
    document.getElementById("browse").scrollIntoView({ behavior: "smooth" });
    loadItems();
  });

  // ---------- Navbar mobile menu ----------
  const navbar = document.getElementById("navbar");
  const burgerBtn = document.getElementById("burgerBtn");
  burgerBtn.addEventListener("click", () => {
    const isOpen = navbar.classList.toggle("is-mobile-open");
    burgerBtn.setAttribute("aria-expanded", String(isOpen));
  });
  document.querySelectorAll(".navlinks a").forEach((a) =>
    a.addEventListener("click", () => navbar.classList.remove("is-mobile-open"))
  );

  // ---------- Modals: generic open/close ----------
  function openModal(overlay) {
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeModal(overlay) {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.is-open").forEach(closeModal);
    }
  });

  // ---------- Report modal ----------
  const reportOverlay = document.getElementById("reportOverlay");
  const reportForm = document.getElementById("reportForm");
  const reportSubmitBtn = document.getElementById("reportSubmitBtn");

  function openReportModal(status) {
    reportForm.reset();
    clearFormErrors(reportForm);
    resetUploader();
    if (status) {
      const radio = reportForm.querySelector(`input[name="status"][value="${status}"]`);
      if (radio) radio.checked = true;
    }
    const dateField = document.getElementById("f-date");
    dateField.value = new Date().toISOString().slice(0, 10);
    dateField.max = new Date().toISOString().slice(0, 10);
    openModal(reportOverlay);
    document.getElementById("f-title").focus();
  }

  // ---------- Image uploader ----------
  const fileInput = document.getElementById("f-image-input");
  const dropzone = document.getElementById("uploaderDropzone");
  const preview = document.getElementById("uploaderPreview");
  const previewImageBox = document.getElementById("uploaderPreviewImage");
  const previewImg = document.getElementById("uploaderPreviewImg");
  const fileNameEl = document.getElementById("uploaderFileName");
  const fileSizeEl = document.getElementById("uploaderFileSize");
  const removeBtn = document.getElementById("uploaderRemoveBtn");
  const overlay = document.getElementById("uploaderOverlay");
  const ring = document.getElementById("uploaderRing");
  const ringText = document.getElementById("uploaderRingText");
  const badge = document.getElementById("uploaderBadge");
  const imageUrlField = document.getElementById("f-image");

  let isUploading = false;
  let currentXhr = null;
  let currentObjectUrl = null;
  const MAX_IMAGE_MB = 5;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function resetUploader() {
    if (currentXhr) {
      currentXhr.abort();
      currentXhr = null;
    }
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    fileInput.value = "";
    imageUrlField.value = "";
    dropzone.hidden = false;
    preview.hidden = true;
    overlay.classList.remove("is-done");
    badge.hidden = true;
    ring.style.setProperty("--pct", 0);
    ringText.textContent = "0%";
    isUploading = false;
  }

  function flashDropzoneError() {
    dropzone.classList.add("is-error");
    setTimeout(() => dropzone.classList.remove("is-error"), 400);
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  // Clicking the existing preview image opens the picker again ("change photo")
  previewImageBox.addEventListener("click", () => fileInput.click());

  ["dragover", "dragenter"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); })
  );
  ["dragleave", "dragend"].forEach((evt) =>
    dropzone.addEventListener(evt, () => dropzone.classList.remove("is-dragover"))
  );
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
  });

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // don't trigger the "change photo" click on the image behind it
    resetUploader();
  });

  function handleFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast("Please choose a JPG, PNG, WEBP or GIF image", "error");
      flashDropzoneError();
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      showToast(`Image must be smaller than ${MAX_IMAGE_MB}MB`, "error");
      flashDropzoneError();
      return;
    }

    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);

    dropzone.hidden = true;
    preview.hidden = false;
    overlay.classList.remove("is-done");
    badge.hidden = true;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size);
    previewImg.src = currentObjectUrl;
    ring.style.setProperty("--pct", 0);
    ringText.textContent = "0%";

    uploadFile(file);
  }

  function uploadFile(file) {
    isUploading = true;
    imageUrlField.value = "";

    const formData = new FormData();
    formData.append("image", file);

    const xhr = new XMLHttpRequest();
    currentXhr = xhr;
    xhr.open("POST", `${API_BASE}/upload`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        ring.style.setProperty("--pct", pct);
        ringText.textContent = `${pct}%`;
      }
    });

    xhr.onload = () => {
      isUploading = false;
      currentXhr = null;
      let data;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }

      if (xhr.status >= 200 && xhr.status < 300 && data?.success) {
        imageUrlField.value = data.data.url;
        ring.style.setProperty("--pct", 100);
        ringText.textContent = "100%";
        overlay.classList.add("is-done");
        badge.hidden = false;
      } else {
        showToast(data?.message || "Image upload failed", "error");
        resetUploader();
      }
    };

    xhr.onerror = () => {
      isUploading = false;
      currentXhr = null;
      showToast("Image upload failed — check your connection", "error");
      resetUploader();
    };

    xhr.onabort = () => {
      isUploading = false;
      currentXhr = null;
    };

    xhr.send(formData);
  }

  document.getElementById("openLostBtn").addEventListener("click", () => openReportModal("Lost"));
  document.getElementById("openFoundBtn").addEventListener("click", () => openReportModal("Found"));
  document.getElementById("heroReportBtn").addEventListener("click", () => openReportModal());
  document.getElementById("emptyReportBtn").addEventListener("click", () => openReportModal());
  document.getElementById("footerLostLink").addEventListener("click", (e) => { e.preventDefault(); openReportModal("Lost"); });
  document.getElementById("footerFoundLink").addEventListener("click", (e) => { e.preventDefault(); openReportModal("Found"); });
  document.getElementById("closeReportModal").addEventListener("click", () => closeModal(reportOverlay));

  // ---------- Form validation helpers ----------
  function clearFormErrors(form) {
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
    form.querySelectorAll(".field__error").forEach((e) => (e.textContent = ""));
  }

  function setFieldError(form, name, message) {
    const field = form.querySelector(`[name="${name}"]`)?.closest(".field");
    const errorEl = form.querySelector(`.field__error[data-for="${name}"]`);
    if (field) field.classList.add("has-error");
    if (errorEl) errorEl.textContent = message;
  }

  function validateReportForm(data) {
    const errors = {};
    if (!data.title.trim()) errors.title = "Please enter a title";
    else if (data.title.trim().length < 3) errors.title = "Title should be at least 3 characters";

    if (!data.category) errors.category = "Please select a category";

    if (!data.description.trim()) errors.description = "Please add a description";
    else if (data.description.trim().length < 10) errors.description = "Add a bit more detail (10+ characters)";

    if (!data.location.trim()) errors.location = "Please enter a location";

    if (!data.date) errors.date = "Please pick a date";
    else if (new Date(data.date) > new Date()) errors.date = "Date can't be in the future";

    if (!data.reporterName.trim()) errors.reporterName = "Please enter your name";

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!data.reporterEmail.trim()) errors.reporterEmail = "Please enter your email";
    else if (!emailRegex.test(data.reporterEmail)) errors.reporterEmail = "Enter a valid email address";

    if (data.reporterPhone && !/^\+?[0-9\s-]{7,15}$/.test(data.reporterPhone)) {
      errors.reporterPhone = "Enter a valid phone number";
    }

    return errors;
  }

  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFormErrors(reportForm);

    if (isUploading) {
      showToast("Please wait for the photo to finish uploading", "info");
      return;
    }

    const formData = new FormData(reportForm);
    const data = Object.fromEntries(formData.entries());

    const errors = validateReportForm(data);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([field, msg]) => setFieldError(reportForm, field, msg));
      showToast("Please fix the highlighted fields", "error");
      return;
    }

    setLoading(reportSubmitBtn, true);
    try {
      const res = await Api.createItem(data);
      showToast(`${data.status} item reported successfully!`, "success");
      closeModal(reportOverlay);
      loadItems();
      loadStats();
      openDetailsModal(res.data._id);
    } catch (err) {
      showToast(err.message || "Couldn't submit the report", "error");
    } finally {
      setLoading(reportSubmitBtn, false);
    }
  });

  function setLoading(btn, isLoading) {
    btn.disabled = isLoading;
    btn.querySelector(".btn__label").style.visibility = isLoading ? "hidden" : "visible";
    btn.querySelector(".btn__spinner").hidden = !isLoading;
  }

  // ---------- Details modal ----------
  const detailsOverlay = document.getElementById("detailsOverlay");
  const detailsContent = document.getElementById("detailsContent");
  let currentDetailsItem = null;

  async function openDetailsModal(id) {
    detailsContent.innerHTML = `<div class="empty-state" style="padding:40px 0;"><p>Loading item details…</p></div>`;
    openModal(detailsOverlay);
    try {
      const res = await Api.getItem(id);
      currentDetailsItem = res.data;
      renderDetails(res.data);
    } catch (err) {
      detailsContent.innerHTML = `<div class="empty-state" style="padding:40px 0;"><h3>Couldn't load item</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  function renderDetails(item) {
    const claimedBlock = item.status === "Claimed" && item.claimedBy?.name
      ? `<div class="details__claimed-box">✅ Claimed by <strong>${escapeHtml(item.claimedBy.name)}</strong> on ${formatDate(item.claimedBy.claimedAt)}${item.claimedBy.note ? ` — "${escapeHtml(item.claimedBy.note)}"` : ""}</div>`
      : "";

    const actions = item.status === "Claimed"
      ? ""
      : `<button class="btn btn--primary" id="detailsClaimBtn">Claim this item</button>`;

    detailsContent.innerHTML = `
      <div class="details__media">
        ${mediaMarkup(item, 40)}
      </div>
      <div class="details__top">
        <h2 class="details__title">${escapeHtml(item.title)}</h2>
        <span class="badge badge--${item.status}">${item.status}</span>
      </div>
      <p class="details__cat">${escapeHtml(item.category)}</p>
      <p class="details__desc">${escapeHtml(item.description)}</p>
      <div class="details__grid">
        <div class="details__field"><span>Location</span><strong>${escapeHtml(item.location)}</strong></div>
        <div class="details__field"><span>Date</span><strong>${formatDate(item.date)}</strong></div>
        <div class="details__field"><span>Reported by</span><strong>${escapeHtml(item.reporterName)}</strong></div>
        <div class="details__field"><span>Contact</span><strong>${escapeHtml(item.reporterEmail)}</strong></div>
      </div>
      ${claimedBlock}
      <div class="details__actions">${actions}</div>
    `;

    const claimBtn = document.getElementById("detailsClaimBtn");
    if (claimBtn) claimBtn.addEventListener("click", () => openClaimModal(item));
  }

  document.getElementById("closeDetailsModal").addEventListener("click", () => closeModal(detailsOverlay));

  // ---------- Claim modal ----------
  const claimOverlay = document.getElementById("claimOverlay");
  const claimForm = document.getElementById("claimForm");
  const claimSubmitBtn = document.getElementById("claimSubmitBtn");
  const claimModalSubtitle = document.getElementById("claimModalSubtitle");

  function openClaimModal(item) {
    claimForm.reset();
    clearFormErrors(claimForm);
    document.getElementById("claimItemId").value = item._id;
    claimModalSubtitle.textContent = `Claiming “${item.title}” — the reporter will be notified via email.`;
    closeModal(detailsOverlay);
    openModal(claimOverlay);
    document.getElementById("c-name").focus();
  }

  document.getElementById("closeClaimModal").addEventListener("click", () => closeModal(claimOverlay));

  claimForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFormErrors(claimForm);

    const formData = new FormData(claimForm);
    const data = Object.fromEntries(formData.entries());
    const itemId = document.getElementById("claimItemId").value;

    const errors = {};
    if (!data.name.trim()) errors.name = "Please enter your name";
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!data.email.trim()) errors.email = "Please enter your email";
    else if (!emailRegex.test(data.email)) errors.email = "Enter a valid email address";

    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([field, msg]) => setFieldError(claimForm, field, msg));
      return;
    }

    setLoading(claimSubmitBtn, true);
    try {
      await Api.claimItem(itemId, data);
      showToast("Item claimed! The reporter has your contact details.", "success");
      closeModal(claimOverlay);
      loadItems();
      loadStats();
    } catch (err) {
      showToast(err.message || "Couldn't claim this item", "error");
    } finally {
      setLoading(claimSubmitBtn, false);
    }
  });

  // ---------- Footer year ----------
  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------- Init ----------
  loadItems();
  loadStats();
})();
