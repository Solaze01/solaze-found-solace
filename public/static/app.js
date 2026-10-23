import { firebaseConfig } from "./firebase-config.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const defaults = { theme: "light", color: "default", font: 19, line: 1.85, width: 660 };
const prefKey = "solaze-reading-preferences-v1";
let preferences = { ...defaults };
try { preferences = { ...defaults, ...JSON.parse(localStorage.getItem(prefKey) || "{}") }; } catch {}
function applyPreferences() {
  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.style.setProperty("--story-ink", preferences.color === "default" ? "" : preferences.color);
  document.documentElement.style.setProperty("--story-size", `${preferences.font}px`);
  document.documentElement.style.setProperty("--story-leading", preferences.line);
  document.documentElement.style.setProperty("--story-width", `${preferences.width}px`);
  const theme = $(`input[name="theme"][value="${preferences.theme}"]`); if (theme) theme.checked = true;
  const color = $(`input[name="text-color"][value="${CSS.escape(preferences.color)}"]`); if (color) color.checked = true;
  if ($("[data-custom-color]") && preferences.color.startsWith("#")) $("[data-custom-color]").value = preferences.color;
  if ($("[data-font-size]")) { $("[data-font-size]").value = preferences.font; $ ("[data-font-output]").textContent = `${preferences.font} px`; }
  if ($("[data-line-height]")) { $("[data-line-height]").value = preferences.line; $ ("[data-line-output]").textContent = Number(preferences.line).toFixed(2); }
  if ($("[data-column-width]")) { $("[data-column-width]").value = preferences.width; $ ("[data-width-output]").textContent = `${preferences.width} px`; }
  localStorage.setItem(prefKey, JSON.stringify(preferences));
}
applyPreferences();
const toggle = $(".settings-toggle");
if (toggle) toggle.addEventListener("click", () => { const panel = $("#reading-settings"); panel.hidden = !panel.hidden; toggle.setAttribute("aria-expanded", String(!panel.hidden)); });
$$('input[name="theme"]').forEach(el => el.addEventListener("change", () => { preferences.theme = el.value; applyPreferences(); }));
$$('input[name="text-color"]').forEach(el => el.addEventListener("change", () => { preferences.color = el.value; applyPreferences(); }));
$("[data-custom-color]")?.addEventListener("input", e => { preferences.color = e.target.value; applyPreferences(); });
$("[data-font-size]")?.addEventListener("input", e => { preferences.font = Number(e.target.value); applyPreferences(); });
$("[data-line-height]")?.addEventListener("input", e => { preferences.line = Number(e.target.value); applyPreferences(); });
$("[data-column-width]")?.addEventListener("input", e => { preferences.width = Number(e.target.value); applyPreferences(); });
$("[data-reset]")?.addEventListener("click", () => { preferences = { ...defaults }; applyPreferences(); });

// Use the browser's built-in speech engine, so no audio service or account is needed.
if ("speechSynthesis" in window && $("[data-story-content]")) {
  const synth = window.speechSynthesis, status = $("[data-speech-status]"), voiceSelect = $("[data-speech-voice]");
  const buttons = Object.fromEntries($$("[data-speech-action]").map(b => [b.dataset.speechAction, b]));
  let utterance;
  const refreshVoices = () => { const voices = synth.getVoices(); const old = voiceSelect.value; voiceSelect.replaceChildren(new Option("Device default", "")); voices.forEach((v, i) => voiceSelect.add(new Option(`${v.name} (${v.lang})`, String(i)))); if (old) voiceSelect.value = old; };
  refreshVoices(); synth.addEventListener("voiceschanged", refreshVoices);
  buttons.play.addEventListener("click", () => { synth.cancel(); utterance = new SpeechSynthesisUtterance($("[data-story-content]").innerText); utterance.rate = Number($("[data-speech-speed]").value); const voice = synth.getVoices()[Number(voiceSelect.value)]; if (voiceSelect.value && voice) utterance.voice = voice; utterance.onend = () => { status.textContent = "Finished reading."; buttons.pause.disabled = buttons.resume.disabled = buttons.stop.disabled = true; }; utterance.onerror = () => { status.textContent = "Read aloud is unavailable on this device."; }; synth.speak(utterance); status.textContent = "Reading aloud…"; buttons.pause.disabled = false; buttons.stop.disabled = false; buttons.resume.disabled = true; });
  buttons.pause.addEventListener("click", () => { synth.pause(); status.textContent = "Paused."; buttons.pause.disabled = true; buttons.resume.disabled = false; });
  buttons.resume.addEventListener("click", () => { synth.resume(); status.textContent = "Reading aloud…"; buttons.pause.disabled = false; buttons.resume.disabled = true; });
  buttons.stop.addEventListener("click", () => { synth.cancel(); status.textContent = "Stopped."; buttons.pause.disabled = buttons.resume.disabled = buttons.stop.disabled = true; });
}

$("[data-share]")?.addEventListener("click", async () => {
  const payload = { title: document.title, text: "A story about pain, hope, and the things we don’t say out loud.", url: location.href };
  try { if (navigator.share) await navigator.share(payload); else { await navigator.clipboard.writeText(location.href); $("[data-share-status]").textContent = "Story link copied. Share it with someone."; } }
  catch (err) { if (err.name !== "AbortError") $("[data-share-status]").textContent = "Sharing is unavailable here. Copy the page address to share."; }
});

const communityStatus = $("[data-community-status]");
const isConfigured = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId;
function setCommunityUnavailable(message) {
  communityStatus.hidden = false;
  communityStatus.textContent = message;
  $("[data-read-count]").textContent = "—";
  if ($("[data-reader-label]")) $("[data-reader-label]").textContent = "Firebase setup needed";
  $("[data-reply-count]").textContent = "Unavailable";
  const form = $("[data-reply-form]");
  if (form) { form.querySelector("textarea").disabled = true; form.querySelector("button[type=submit]").disabled = true; }
}
if (isConfigured) {
  communityStatus.textContent = "Connecting to the community…";
  initializeCommunity().catch(error => { console.error("Community service setup error", error); setCommunityUnavailable("Firebase could not connect. Check your project settings, anonymous sign-in, Firestore rules, and Vercel domain."); });
} else {
  setCommunityUnavailable("Reader counts and replies are offline until Firebase is configured for this site.");
}

async function initializeCommunity() {
  const [appSdk, authSdk, storeSdk] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js")
  ]);
  const app = appSdk.initializeApp(firebaseConfig), auth = authSdk.getAuth(app), db = storeSdk.getFirestore(app);
  const user = await new Promise((resolve, reject) => {
    const unsub = authSdk.onAuthStateChanged(auth, async current => { unsub(); try { resolve(current || await authSdk.signInAnonymously(auth).then(result => result.user)); } catch (e) { reject(e); } }, reject);
  });
  const readerRef = storeSdk.doc(db, "readers", user.uid);
  await storeSdk.runTransaction(db, async tx => { const snap = await tx.get(readerRef); if (!snap.exists()) tx.set(readerRef, { createdAt: storeSdk.serverTimestamp() }); });
  try { const count = await storeSdk.getCountFromServer(storeSdk.collection(db, "readers")); $("[data-read-count]").textContent = count.data().count.toLocaleString(); $("[data-reader-label]").textContent = "readers"; }
  catch { $("[data-read-count]").textContent = "—"; $("[data-reader-label]").textContent = "Count unavailable"; }

  const replyCollection = storeSdk.collection(db, "replies"), replyList = $("[data-reply-list]");
  const reactionTypes = [["heart", "♡"], ["thoughtful", "Thoughtful"], ["support", "Support"]];
  const esc = value => { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; };
  function renderReplies(docs) {
    const ordered = docs.slice().sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()).slice(0, 30);
    if (!ordered.length) { replyList.innerHTML = '<p class="no-replies">No replies yet. You can be the first to respond with care.</p>'; return; }
    replyList.innerHTML = ordered.map(d => { const val = d.data(), when = val.createdAt?.toDate?.() || new Date(); return `<article class="reply" id="reply-${d.id}"><div class="reply-byline"><strong>Anonymous</strong><time datetime="${when.toISOString()}">${when.toLocaleDateString()}</time></div><p class="reply-body">${esc(val.body || "")}</p><div class="reaction-list" data-reactions="${d.id}"></div></article>`; }).join("");
    ordered.forEach(async d => {
      const root = $(`[data-reactions="${d.id}"]`); if (!root) return;
      try {
        const snap = await storeSdk.getDocs(storeSdk.collection(db, "replies", d.id, "reactions"));
        const mine = snap.docs.find(r => r.id === user.uid)?.data()?.reaction;
        root.innerHTML = reactionTypes.map(([type, label]) => { const n = snap.docs.filter(r => r.data().reaction === type).length; return `<button type="button" class="reaction-button${mine === type ? " selected" : ""}" data-react="${type}" aria-pressed="${mine === type}" aria-label="${label} · ${n} reactions">${label} <span>${n}</span></button>`; }).join("");
        root.querySelectorAll("[data-react]").forEach(button => button.addEventListener("click", async () => {
          const ref = storeSdk.doc(db, "replies", d.id, "reactions", user.uid), chosen = button.dataset.react;
          try { if (mine === chosen) await storeSdk.deleteDoc(ref); else await storeSdk.setDoc(ref, { reaction: chosen, updatedAt: storeSdk.serverTimestamp() }); }
          catch { communityStatus.textContent = "Could not save that reaction. Please try again."; }
        }));
      } catch { root.textContent = "Reactions unavailable"; }
    });
  }
  storeSdk.onSnapshot(storeSdk.query(replyCollection, storeSdk.orderBy("createdAt", "desc"), storeSdk.limit(30)), snap => {
    renderReplies(snap.docs);
    storeSdk.getCountFromServer(replyCollection).then(countSnap => {
      const n = countSnap.data().count;
      $("[data-reply-count]").textContent = `${n.toLocaleString()} ${n === 1 ? "reply" : "replies"}`;
    }).catch(() => { $("[data-reply-count]").textContent = "Count unavailable"; });
    communityStatus.hidden = true;
  }, () => { communityStatus.hidden = false; communityStatus.textContent = "Could not load replies. Check the Firestore rules and try again."; });
  $("[data-reply-form]").addEventListener("submit", async event => {
    event.preventDefault(); const form = event.currentTarget, body = form.elements.body.value.trim(), submit = form.querySelector("button[type=submit]");
    if (body.length < 3 || body.length > 500) return;
    submit.disabled = true;
    try { await storeSdk.addDoc(replyCollection, { body, author: "Anonymous", createdAt: storeSdk.serverTimestamp() }); form.reset(); communityStatus.hidden = false; communityStatus.textContent = "Your anonymous reply has been posted."; }
    catch { communityStatus.hidden = false; communityStatus.textContent = "Could not post your reply. Please try again."; }
    finally { submit.disabled = false; }
  });
}
