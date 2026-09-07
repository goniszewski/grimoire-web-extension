import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookOpen, Check, ChevronDown, Folder, Layers3, LoaderCircle, LogOut, Pin, Plus, RefreshCw, Search, Settings, Tag, X } from "lucide-react";
import { browserIntegrationSettingsUrl, normalizeEndpoint, permissionPattern } from "../../src/lib/endpoint";
import { getConnection, migrateLegacySyncStorage } from "../../src/lib/storage";
import type { BackgroundRequest, BackgroundResponse, BatchCaptureResult, CaptureDraft, CaptureResult, ConnectionConfig, ConnectionState, Taxonomy } from "../../src/lib/types";

const MAX_BATCH_SIZE = 500;

interface PageDetails {
  url: string;
  title: string;
  selectedText: string;
  faviconUrl: string;
  domain: string;
}

interface OpenTabDetails extends PageDetails {
  id: number;
  windowId: number;
  active: boolean;
}

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

async function currentPage(): Promise<PageDetails> {
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
  return {
    url: tab.url,
    title: tab.title || tab.url,
    selectedText,
    faviconUrl: tab.favIconUrl ?? "",
    domain: new URL(tab.url).hostname.replace(/^www\./, ""),
  };
}

function pageFromTab(tab: Browser.tabs.Tab): OpenTabDetails | null {
  if (tab.id === undefined || !tab.url || !/^https?:/.test(tab.url)) return null;
  return {
    id: tab.id,
    windowId: tab.windowId,
    active: tab.active,
    url: tab.url,
    title: tab.title || tab.url,
    selectedText: "",
    faviconUrl: tab.favIconUrl ?? "",
    domain: new URL(tab.url).hostname.replace(/^www\./, ""),
  };
}

async function openPages(): Promise<OpenTabDetails[]> {
  return (await browser.tabs.query({}))
    .map(pageFromTab)
    .filter((tab): tab is OpenTabDetails => tab !== null);
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

function BrandHeader({ subtitle, endpoint, onDisconnect }: { subtitle: string; endpoint?: string; onDisconnect?: () => void }) {
  return (
    <header className="brand-header">
      <div className="brand-mark" aria-hidden="true"><img src={browser.runtime.getURL("/icons/icon-32.png")} alt="" /></div>
      <div className="brand-copy"><h1>Grimoire</h1><p>{subtitle}</p></div>
      {onDisconnect && (
        <div className="header-actions">
          <button type="button" className="icon-button" title="Open Grimoire settings" aria-label="Open Grimoire settings" onClick={() => endpoint && void browser.tabs.create({ url: browserIntegrationSettingsUrl(endpoint) })}><Settings size={16} /></button>
          <button type="button" className="icon-button" title="Disconnect" aria-label="Disconnect" onClick={onDisconnect}><LogOut size={16} /></button>
        </div>
      )}
    </header>
  );
}

export function App() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
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
  const [domain, setDomain] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [faviconFailed, setFaviconFailed] = useState(false);
  const [openTabs, setOpenTabs] = useState<OpenTabDetails[]>([]);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set());
  const [tabFilter, setTabFilter] = useState("");
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [readLater, setReadLater] = useState(false);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ categories: [], tags: [] });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const suggestedTags = useMemo(() => {
    const needle = tagInput.trim().toLowerCase();
    return taxonomy.tags.filter((tag) => !tags.includes(tag) && (!needle || tag.includes(needle))).slice(0, 6);
  }, [tagInput, tags, taxonomy.tags]);
  const supportsPinned = connection?.protocol === "legacy" || connection?.captureFields?.isPinned === true;
  const supportsReadLater = connection?.protocol === "current" && connection.captureFields?.readLater === true;
  const visibleTabs = useMemo(() => {
    const needle = tabFilter.trim().toLowerCase();
    return needle
      ? openTabs.filter((tab) => `${tab.title} ${tab.domain} ${tab.url}`.toLowerCase().includes(needle))
      : openTabs;
  }, [openTabs, tabFilter]);
  const batchSizeExceeded = mode === "bulk" && selectedTabIds.size > MAX_BATCH_SIZE;

  useEffect(() => {
    void (async () => {
      const saved = await migrateLegacySyncStorage() ?? await getConnection();
      if (!saved) return;
      setEndpoint(saved.endpoint);
      const origins = [permissionPattern(saved.endpoint)];
      if (await browser.permissions.contains({ origins })) {
        const refreshed = saved.protocol === "current"
          ? await send<ConnectionConfig>({ type: "connect-current", endpoint: saved.endpoint, token: saved.token })
          : saved;
        setConnection(refreshed);
      } else setPendingConnection(saved);
    })().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not restore the saved connection"));
  }, []);

  useEffect(() => {
    if (!connection) return;
    setEndpoint(connection.endpoint);
    void currentPage().then((page) => {
      setUrl(page.url);
      setTitle(page.title);
      setSelectedText(page.selectedText);
      setFaviconUrl(page.faviconUrl);
      setFaviconFailed(false);
      setDomain(page.domain);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not read the active page"));
    void send<Taxonomy>({ type: "taxonomy" }).then((nextTaxonomy) => {
      setTaxonomy(nextTaxonomy);
      if (connection.protocol === "legacy" && nextTaxonomy.categories[0]) {
        const initial = nextTaxonomy.categories.find((category) => category.initial);
        setCategoryId(initial?.id ?? nextTaxonomy.categories[0].id);
      }
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load categories and tags"));
  }, [connection]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setStatus("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unexpected error"); }
    finally { setBusy(false); }
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

  function addTag(rawValue = tagInput) {
    const nextTag = normalizeTag(rawValue);
    if (nextTag && !tags.includes(nextTag)) setTags((current) => [...current, nextTag]);
    setTagInput("");
  }

  async function loadOpenTabs(): Promise<void> {
    setLoadingTabs(true);
    try {
      const tabs = await openPages();
      setOpenTabs(tabs);
      setSelectedTabIds((current) => {
        const available = new Set(tabs.map((tab) => tab.id));
        const retained = new Set([...current].filter((id) => available.has(id)));
        if (retained.size > 0) return retained;
        return new Set(tabs.filter((tab) => tab.active).map((tab) => tab.id));
      });
    } finally {
      setLoadingTabs(false);
    }
  }

  function selectMode(nextMode: "single" | "bulk") {
    setMode(nextMode);
    setError("");
    setStatus("");
    if (nextMode === "bulk") {
      void loadOpenTabs().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not list open tabs"));
    }
  }

  function sharedDraft(page: Pick<PageDetails, "url" | "title">, captureTags: string[]): CaptureDraft {
    return {
      url: page.url,
      title: page.title,
      ...(categoryId ? { categoryId } : {}),
      tags: captureTags,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      isPinned,
      readLater,
    };
  }

  function save() {
    void run(async () => {
      if (!connection) throw new Error("Connect Grimoire first");
      if (connection.protocol === "legacy" && !categoryId) throw new Error("Legacy Grimoire requires a category");
      const pendingTag = normalizeTag(tagInput);
      const captureTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;
      if (pendingTag) { setTags(captureTags); setTagInput(""); }
      if (mode === "bulk") {
        const selectedTabs = openTabs.filter((tab) => selectedTabIds.has(tab.id));
        if (selectedTabs.length === 0) throw new Error("Select at least one open tab");
        if (selectedTabs.length > MAX_BATCH_SIZE) {
          throw new Error(`Bulk capture supports at most ${MAX_BATCH_SIZE} tabs.`);
        }
        const result = await send<BatchCaptureResult>({
          type: "capture-many",
          drafts: selectedTabs.map((tab) => sharedDraft(tab, captureTags)),
        });
        const parts = [
          result.created ? `${result.created} saved` : "",
          result.duplicates ? `${result.duplicates} already in Grimoire` : "",
        ].filter(Boolean);
        if (parts.length) setStatus(`${parts.join(", ")}.`);
        if (result.failed) {
          const first = result.failures[0];
          setError(`${result.failed} failed${first ? ` — ${first.title}: ${first.detail}` : ""}`);
        }
        return;
      }
      const result = await send<CaptureResult>({
        type: "capture",
        draft: { ...sharedDraft({ url, title }, captureTags), ...(selectedText ? { selectedText } : {}) },
      });
      setStatus(result.created ? "Saved to your library." : "Already in Grimoire. The existing bookmark was left unchanged.");
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
        <main className="panel setup-panel">
          <BrandHeader subtitle="Reconnect your local library" />
          <div className="warning">Grant access to <strong>{pendingConnection.endpoint}</strong> to restore this connection.</div>
          <button className="primary-button" disabled={busy} onClick={() => void run(async () => {
            await ensureEndpointPermission(pendingConnection.endpoint);
            const restored = pendingConnection.protocol === "current"
              ? await send<ConnectionConfig>({
                type: "connect-current",
                endpoint: pendingConnection.endpoint,
                token: pendingConnection.token,
              })
              : pendingConnection;
            setConnection(restored);
            setPendingConnection(null);
          })}>Grant access and reconnect</button>
          <button className="text-button" disabled={busy} onClick={disconnect}>Forget saved connection</button>
          {error && <p className="feedback error" role="alert">{error}</p>}
        </main>
      );
    }
    return (
      <main className="panel setup-panel">
        <BrandHeader subtitle="Connect your private library" />
        <label className="field-label">Grimoire address<input value={endpoint} onChange={(event) => { setEndpoint(event.target.value); setDiscovered(null); setCheckedEndpoint(null); }} /></label>
        <button className="secondary-button" disabled={busy} onClick={detect}>Check connection</button>
        {discovered?.kind === "current" && <>
          <div className="notice"><Check size={15} />Grimoire {discovered.version} supports secure Companion capture.</div>
          <label className="field-label">Integration token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} /></label>
          <button className="text-button" onClick={() => void browser.tabs.create({ url: browserIntegrationSettingsUrl(endpoint) })}>Open Browser Integration settings</button>
        </>}
        {discovered?.kind === "legacy" && <>
          <div className="warning">Legacy Grimoire {discovered.version}. Compatibility mode is temporary.</div>
          <label className="field-label">Username or email<input value={login} onChange={(event) => setLogin(event.target.value)} /></label>
          <label className="field-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        </>}
        {discovered && discovered.kind !== "unknown" && <button className="primary-button" disabled={busy || (discovered.kind === "current" ? !token.trim() : !login.trim() || !password)} onClick={connect}>Connect to Grimoire</button>}
        {error && <p className="feedback error" role="alert">{error}</p>}
      </main>
    );
  }

  return (
    <main className="panel capture-panel">
      <BrandHeader subtitle={connection.protocol === "legacy" ? "Legacy compatibility mode" : "Save to your library"} endpoint={connection.endpoint} onDisconnect={disconnect} />
      <div className="mode-switch" role="tablist" aria-label="Capture mode">
        <button type="button" role="tab" aria-selected={mode === "single"} className={mode === "single" ? "active" : ""} onClick={() => selectMode("single")}><Bookmark size={14} />Current page</button>
        <button type="button" role="tab" aria-selected={mode === "bulk"} className={mode === "bulk" ? "active" : ""} onClick={() => selectMode("bulk")}><Layers3 size={14} />Open tabs</button>
      </div>

      {mode === "single" ? <><section className="page-preview" aria-label="Page preview">
        <div className="favicon-frame" aria-hidden="true">
          <span>{domain.slice(0, 1).toUpperCase() || <Bookmark size={18} />}</span>
          {faviconUrl && !faviconFailed && <img src={faviconUrl} alt="" onError={() => setFaviconFailed(true)} />}
        </div>
        <div className="page-copy">
          <span className="domain">{domain || "Current page"}</span>
          <input className="title-input" aria-label="Bookmark title" value={title} maxLength={2_000} onChange={(event) => setTitle(event.target.value)} />
        </div>
      </section>

      <details className="url-details">
        <summary><span>Page address</span><ChevronDown size={14} /></summary>
        <input aria-label="Bookmark URL" value={url} onChange={(event) => {
          setUrl(event.target.value);
          try { setDomain(new URL(event.target.value).hostname.replace(/^www\./, "")); } catch { /* Keep last valid domain. */ }
        }} />
      </details></> : <section className="tab-picker" aria-label="Open tabs">
        <div className="tab-picker-toolbar">
          <strong>{selectedTabIds.size} of {openTabs.length} selected</strong>
          <div>
            <button type="button" className="compact-button" disabled={loadingTabs} aria-label="Refresh open tabs" title="Refresh open tabs" onClick={() => void loadOpenTabs()}><RefreshCw className={loadingTabs ? "spinner" : ""} size={13} /></button>
            <button type="button" className="text-button" onClick={() => setSelectedTabIds(selectedTabIds.size === openTabs.length ? new Set() : new Set(openTabs.map((tab) => tab.id)))}>{selectedTabIds.size === openTabs.length ? "Clear" : "Select all"}</button>
          </div>
        </div>
        {batchSizeExceeded && (
          <p className="warning">Bulk capture is limited to {MAX_BATCH_SIZE} tabs. Select fewer tabs to continue.</p>
        )}
        <label className="tab-search"><Search size={14} /><input aria-label="Filter open tabs" value={tabFilter} placeholder="Filter tabs…" onChange={(event) => setTabFilter(event.target.value)} /></label>
        <div className="tab-list">
          {visibleTabs.map((tab) => <label className="tab-row" key={tab.id}>
            <input type="checkbox" checked={selectedTabIds.has(tab.id)} onChange={() => setSelectedTabIds((current) => {
              const next = new Set(current);
              if (next.has(tab.id)) next.delete(tab.id); else next.add(tab.id);
              return next;
            })} />
            <span className="tab-favicon" aria-hidden="true">{tab.domain.slice(0, 1).toUpperCase()} {tab.faviconUrl && <img src={tab.faviconUrl} alt="" />}</span>
            <span className="tab-copy"><strong>{tab.title}</strong><small>{tab.domain}</small></span>
          </label>)}
          {!loadingTabs && visibleTabs.length === 0 && <p className="empty-tabs">No matching web tabs.</p>}
        </div>
      </section>}

      <div className="form-grid">
        <label className="field-label"><span><Folder size={14} />Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">No category</option>
          {taxonomy.categories.map((category) => <option key={category.id} value={category.id}>{"— ".repeat(category.depth)}{category.name}</option>)}
        </select></label>

        <div className="field-label tag-field">
          <span><Tag size={14} />Tags</span>
          <div className="tag-editor" onClick={(event) => (event.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}>
            {tags.map((tag) => <span className="tag-chip" key={tag}>{tag}<button type="button" aria-label={`Remove ${tag} tag`} onClick={() => setTags((current) => current.filter((value) => value !== tag))}><X size={11} /></button></span>)}
            <input aria-label="Add tag" value={tagInput} placeholder={tags.length ? "Add another…" : "Add tags…"} onChange={(event) => setTagInput(event.target.value)} onBlur={() => { if (tagInput.trim()) addTag(); }} onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); }
              else if (event.key === "Backspace" && !tagInput && tags.length) setTags((current) => current.slice(0, -1));
            }} />
          </div>
          {suggestedTags.length > 0 && <div className="tag-suggestions" aria-label="Suggested tags">
            {suggestedTags.map((tag) => <button type="button" key={tag} onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(tag)}><Plus size={11} />{tag}</button>)}
          </div>}
        </div>

        <label className="field-label"><span>Note</span><textarea rows={3} value={notes} placeholder="Why is this worth keeping?" onChange={(event) => setNotes(event.target.value)} /></label>
      </div>

      {mode === "single" && selectedText && <details className="selection"><summary><span>Selected text included</span><ChevronDown size={14} /></summary><p>{selectedText.slice(0, 240)}{selectedText.length > 240 ? "…" : ""}</p></details>}

      <div className="state-actions" role="group" aria-label="Bookmark options">
        <button type="button" className={isPinned ? "state-button active" : "state-button"} aria-pressed={isPinned} disabled={busy || !supportsPinned} title={!supportsPinned ? "Pinning requires a newer Grimoire capture API" : undefined} onClick={() => setIsPinned((value) => !value)}>
          <Pin size={16} /><span><strong>Pin</strong><small>Keep at the top</small></span><span className="check-indicator"><Check size={12} /></span>
        </button>
        <button type="button" className={readLater ? "state-button active read-later" : "state-button read-later"} aria-pressed={readLater} disabled={busy || !supportsReadLater} title={!supportsReadLater ? "Read Later requires a newer Grimoire capture API" : undefined} onClick={() => setReadLater((value) => !value)}>
          <BookOpen size={16} /><span><strong>Read later</strong><small>Add to your queue</small></span><span className="check-indicator"><Check size={12} /></span>
        </button>
      </div>

      <footer className="save-footer">
        <button className="primary-button save-button" disabled={busy || (mode === "single" ? !url || !title : selectedTabIds.size === 0 || selectedTabIds.size > MAX_BATCH_SIZE)} onClick={save}>
          {busy ? <><LoaderCircle className="spinner" size={16} />Saving…</> : mode === "bulk" ? <><Layers3 size={16} />Save {selectedTabIds.size} tabs</> : <><Bookmark size={16} />Save bookmark</>}
        </button>
        {status && <p className="feedback success" role="status">{status}</p>}
        {error && <p className="feedback error" role="alert">{error}</p>}
      </footer>
    </main>
  );
}
