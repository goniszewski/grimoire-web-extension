import { useEffect, useState } from "react";
import { normalizeEndpoint, permissionPattern } from "../../src/lib/endpoint";
import { getConnection, migrateLegacySyncStorage } from "../../src/lib/storage";
import type {
  BackgroundRequest,
  BackgroundResponse,
  CaptureResult,
  ConnectionConfig,
  ConnectionState,
  Taxonomy,
} from "../../src/lib/types";

async function send<T>(message: BackgroundRequest): Promise<T> {
  const response = await browser.runtime.sendMessage(message) as BackgroundResponse;
  if (!response.ok) throw new Error(response.detail);
  return response.data as T;
}

async function ensureEndpointPermission(endpoint: string): Promise<void> {
  const origins = [permissionPattern(endpoint)];
  if (await browser.permissions.contains({ origins })) return;
  if (!(await browser.permissions.request({ origins }))) {
    throw new Error("Permission to connect to this Grimoire address was not granted");
  }
}

async function currentPage(): Promise<{ url: string; title: string; selectedText: string }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) {
    throw new Error("Open a normal web page before saving it");
  }
  let selectedText = "";
  try {
    const [selection] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString().trim() ?? "",
    });
    selectedText = String(selection?.result ?? "").slice(0, 10_000);
  } catch {
    // Restricted pages can still be captured from tab metadata.
  }
  return { url: tab.url, title: tab.title || tab.url, selectedText };
}

export function App() {
  const [connection, setConnection] = useState<ConnectionConfig | null>(null);
  const [pendingConnection, setPendingConnection] = useState<ConnectionConfig | null>(null);
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:3210");
  const [discovered, setDiscovered] = useState<ConnectionState | null>(null);
  const [checkedEndpoint, setCheckedEndpoint] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ categories: [], tags: [] });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const saved = await migrateLegacySyncStorage() ?? await getConnection();
      if (!saved) return;
      setEndpoint(saved.endpoint);
      const origins = [permissionPattern(saved.endpoint)];
      if (await browser.permissions.contains({ origins })) {
        setConnection(saved);
      } else {
        setPendingConnection(saved);
      }
    })().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Could not restore the saved connection");
    });
  }, []);

  useEffect(() => {
    if (!connection) return;
    setEndpoint(connection.endpoint);
    void currentPage()
      .then((page) => {
        setUrl(page.url);
        setTitle(page.title);
        setSelectedText(page.selectedText);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not read the active page"));
    void send<Taxonomy>({ type: "taxonomy" })
      .then((nextTaxonomy) => {
        setTaxonomy(nextTaxonomy);
        if (connection.protocol === "legacy" && nextTaxonomy.categories[0]) {
          const initial = nextTaxonomy.categories.find((category) => category.initial);
          setCategoryId(initial?.id ?? nextTaxonomy.categories[0].id);
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load categories and tags"));
  }, [connection]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  function detect() {
    void run(async () => {
      const normalizedEndpoint = normalizeEndpoint(endpoint);
      await ensureEndpointPermission(normalizedEndpoint);
      const state = await send<ConnectionState>({ type: "discover", endpoint: normalizedEndpoint });
      setEndpoint(normalizedEndpoint);
      setDiscovered(state);
      setCheckedEndpoint(normalizedEndpoint);
      if (state.kind === "unknown") throw new Error(state.detail);
    });
  }

  function connect() {
    void run(async () => {
      if (!discovered || discovered.kind === "unknown") throw new Error("Check the Grimoire address first");
      const normalizedEndpoint = normalizeEndpoint(endpoint);
      if (normalizedEndpoint !== checkedEndpoint) throw new Error("Check this Grimoire address again");
      await ensureEndpointPermission(normalizedEndpoint);
      const next = discovered.kind === "current"
        ? await send<ConnectionConfig>({ type: "connect-current", endpoint: normalizedEndpoint, token })
        : await send<ConnectionConfig>({ type: "login-legacy", endpoint: normalizedEndpoint, login, password });
      setConnection(next);
      setPassword("");
    });
  }

  function save() {
    void run(async () => {
      if (!connection) throw new Error("Connect Grimoire first");
      if (connection.protocol === "legacy" && !categoryId) {
        throw new Error("Legacy Grimoire requires a category");
      }
      const parsedTags = tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      const result = await send<CaptureResult>({
        type: "capture",
        draft: {
          url,
          title,
          ...(categoryId ? { categoryId } : {}),
          tags: parsedTags,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(selectedText ? { selectedText } : {}),
        },
      });
      setStatus(result.created ? "Saved to Grimoire." : "Already in Grimoire. Your existing bookmark was left unchanged.");
    });
  }

  function disconnect() {
    void run(async () => {
      await send<void>({ type: "disconnect" });
      setConnection(null);
      setPendingConnection(null);
      setDiscovered(null);
      setCheckedEndpoint(null);
      setToken("");
      setStatus("");
    });
  }

  if (!connection) {
    if (pendingConnection) {
      return (
        <main className="panel">
          <header><span className="sigil">G</span><div><h1>Reconnect Grimoire</h1><p>Restore your existing Companion connection.</p></div></header>
          <div className="warning">The extension now needs permission to reach {pendingConnection.endpoint}.</div>
          <button disabled={busy} onClick={() => void run(async () => {
            await ensureEndpointPermission(pendingConnection.endpoint);
            setConnection(pendingConnection);
            setPendingConnection(null);
          })}>Grant access and reconnect</button>
          <button className="link" disabled={busy} onClick={disconnect}>Forget saved connection</button>
          {error && <p className="error" role="alert">{error}</p>}
        </main>
      );
    }

    return (
      <main className="panel">
        <header><span className="sigil">G</span><div><h1>Grimoire Companion</h1><p>Connect to your private library.</p></div></header>
        <label>Grimoire address<input value={endpoint} onChange={(event) => {
          setEndpoint(event.target.value);
          setDiscovered(null);
          setCheckedEndpoint(null);
        }} /></label>
        <button className="secondary" disabled={busy} onClick={detect}>Check connection</button>
        {discovered?.kind === "current" && <>
          <div className="notice">Grimoire {discovered.version} supports secure Companion capture.</div>
          <label>Integration token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} /></label>
          <button className="link" onClick={() => void browser.tabs.create({ url: `${endpoint.replace(/\/$/, "")}/settings` })}>Open Browser Integration settings</button>
        </>}
        {discovered?.kind === "legacy" && <>
          <div className="warning">Legacy Grimoire {discovered.version}. Compatibility mode is temporary.</div>
          <label>Username or email<input value={login} onChange={(event) => setLogin(event.target.value)} /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        </>}
        {discovered && discovered.kind !== "unknown" && <button
          disabled={busy || (discovered.kind === "current" ? !token.trim() : !login.trim() || !password)}
          onClick={connect}
        >Connect</button>}
        {error && <p className="error" role="alert">{error}</p>}
      </main>
    );
  }

  return (
    <main className="panel">
      <header><span className="sigil">G</span><div><h1>Save page</h1><p>{connection.protocol === "legacy" ? "Legacy compatibility mode" : "Local Grimoire"}</p></div></header>
      <label>Title<input value={title} maxLength={2_000} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>URL<input value={url} onChange={(event) => setUrl(event.target.value)} /></label>
      <label>Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
        <option value="">No category</option>
        {taxonomy.categories.map((category) => <option key={category.id} value={category.id}>{"— ".repeat(category.depth)}{category.name}</option>)}
      </select></label>
      <label>Tags<input list="known-tags" value={tags} placeholder="research, reference" onChange={(event) => setTags(event.target.value)} /></label>
      <datalist id="known-tags">{taxonomy.tags.map((tag) => <option key={tag} value={tag} />)}</datalist>
      <label>Notes<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {selectedText && <div className="selection"><strong>Selected text included</strong><span>{selectedText.slice(0, 180)}{selectedText.length > 180 ? "…" : ""}</span></div>}
      <button disabled={busy || !url || !title} onClick={save}>{busy ? "Saving…" : "Save to Grimoire"}</button>
      {status && <p className="success" role="status">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="link" disabled={busy} onClick={disconnect}>Disconnect</button>
    </main>
  );
}
