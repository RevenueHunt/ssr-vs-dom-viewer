import { useState, useEffect } from 'react'
import './App.css'

function getQueryParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Utility to rewrite relative URLs to absolute based on a base URL
function rewriteResourceUrls(html: string, baseUrl: string): string {
  if (!baseUrl) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Rewrite <img src>, <script src>, <link href>, <a href>, etc.
    doc.querySelectorAll('[src]').forEach((el) => {
      const src = el.getAttribute('src');
      if (src && !src.match(/^([a-z]+:)?\/\//i) && !src.startsWith('data:')) {
        el.setAttribute('src', new URL(src, baseUrl).href);
      }
    });
    doc.querySelectorAll('[href]').forEach((el) => {
      const href = el.getAttribute('href');
      if (href && !href.match(/^([a-z]+:)?\/\//i) && !href.startsWith('data:')) {
        el.setAttribute('href', new URL(href, baseUrl).href);
      }
    });
    return doc.documentElement.outerHTML;
  } catch {
    return html;
  }
}

// Utility to highlight differences: new in Rendered (red), missing in SSR (orange)
function highlightDifferencesBoth(renderedHtml: string, ssrHtml: string): { rendered: string; ssr: string } {
  try {
    const parser = new DOMParser();
    const renderedDoc = parser.parseFromString(renderedHtml, 'text/html');
    const ssrDoc = parser.parseFromString(ssrHtml, 'text/html');

    function traverseBoth(rNode: Element | null, sNode: Element | null) {
      const rChildren = rNode ? Array.from(rNode.children) : [];
      const sChildren = sNode ? Array.from(sNode.children) : [];
      const maxLen = Math.max(rChildren.length, sChildren.length);
      for (let i = 0; i < maxLen; i++) {
        const rChild = rChildren[i] || null;
        const sChild = sChildren[i] || null;
        if (rChild && (!sChild || rChild.tagName !== sChild.tagName)) {
          rChild.classList.add('diff-added');
        }
        if (sChild && (!rChild || rChild.tagName !== sChild.tagName)) {
          sChild.classList.add('diff-missing');
        }
        if (rChild && sChild && rChild.tagName === sChild.tagName) {
          traverseBoth(rChild, sChild);
        }
      }
    }
    if (renderedDoc.body && ssrDoc.body) {
      traverseBoth(renderedDoc.body, ssrDoc.body);
    }
    return {
      rendered: renderedDoc.documentElement.outerHTML,
      ssr: ssrDoc.documentElement.outerHTML,
    };
  } catch {
    return { rendered: renderedHtml, ssr: ssrHtml };
  }
}

function App() {
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [rewriteResources, setRewriteResources] = useState<boolean>(true);
  const [highlightDiffs, setHighlightDiffs] = useState<boolean>(false);

  const [ssrHtml, setSsrHtml] = useState<string>('');
  const [ssrLoading, setSsrLoading] = useState<boolean>(false);
  const [ssrError, setSsrError] = useState<string | null>(null);

  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [renderedLoading, setRenderedLoading] = useState<boolean>(false);
  const [renderedError, setRenderedError] = useState<string | null>(null);

  const targetUrl = getQueryParam('url');
  const tabId = getQueryParam('tabId');

  // Fetch SSR HTML
  useEffect(() => {
    if (!targetUrl) return;
    setSsrLoading(true);
    setSsrError(null);
    fetch(targetUrl, { credentials: 'omit' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      })
      .then((html) => {
        setSsrHtml(html);
        setSsrLoading(false);
      })
      .catch((err) => {
        setSsrError(err.message);
        setSsrLoading(false);
      });
  }, [targetUrl]);

  // Request rendered DOM from background script
  useEffect(() => {
    if (!tabId || !chrome?.runtime?.sendMessage) return;
    setRenderedLoading(true);
    setRenderedError(null);
    chrome.runtime.sendMessage(
      {
        type: 'REQUEST_RENDERED_DOM',
        tabId: Number(tabId),
      },
      (response: { error?: string; dom?: string }) => {
        if (response?.error) {
          setRenderedError(response.error);
          setRenderedLoading(false);
        } else if (response?.dom) {
          setRenderedHtml(response.dom);
          setRenderedLoading(false);
        } else {
          setRenderedError('No response from content script');
          setRenderedLoading(false);
        }
      }
    );
  }, [tabId]);

  // Compute base URL for rewriting
  const baseUrl = targetUrl ? (() => {
    try {
      const u = new URL(targetUrl);
      return u.origin + u.pathname.replace(/\/[^/]*$/, '/');
    } catch {
      return '';
    }
  })() : '';

  // Optionally rewrite resource URLs
  let ssrHtmlToRender = rewriteResources && !showRaw ? rewriteResourceUrls(ssrHtml, baseUrl) : ssrHtml;
  let renderedHtmlToRender = rewriteResources && !showRaw ? rewriteResourceUrls(renderedHtml, baseUrl) : renderedHtml;

  // Optionally highlight differences in both panels
  if (highlightDiffs && !showRaw && renderedHtmlToRender && ssrHtmlToRender) {
    const diffed = highlightDifferencesBoth(renderedHtmlToRender, ssrHtmlToRender);
    renderedHtmlToRender = diffed.rendered.replace(
      /<head(.*?)>/i,
      `<head$1><style>.diff-added { border: 2px solid red !important; box-sizing: border-box; }</style>`
    );
    ssrHtmlToRender = diffed.ssr.replace(
      /<head(.*?)>/i,
      `<head$1><style>.diff-missing { border: 2px dashed orange !important; box-sizing: border-box; }</style>`
    );
  }

  return (
    <div className="compare-root">
      <header className="compare-header">
        <div className="header-labels">
          <span>SSR (Original)</span>
          <span>Rendered (Live)</span>
        </div>
        <div className="header-options-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <label style={{ marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={showRaw}
              onChange={e => setShowRaw(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            Show raw HTML
          </label>
          <label
            title="The rendered view may not match the real page due to browser security restrictions. Enabling resource URL rewriting may improve fidelity for images and styles, but scripts will still not run."
            style={{ marginBottom: 4 }}
          >
            <input
              type="checkbox"
              checked={rewriteResources}
              onChange={e => setRewriteResources(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            Rewrite resource URLs
          </label>
          <label
            title="Highlight elements in the Rendered (Live) DOM that do not exist in the SSR (Original) DOM, and vice versa. Experimental: only detects new/missing elements by tag and position."
          >
            <input
              type="checkbox"
              checked={highlightDiffs}
              onChange={e => setHighlightDiffs(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            Highlight differences (experimental)
          </label>
        </div>
      </header>
      <main className="compare-panels">
        <section className="panel panel-ssr">
          {ssrLoading ? (
            <div style={{ padding: '1rem' }}>Loading SSR HTML...</div>
          ) : ssrError ? (
            <div style={{ color: 'red', padding: '1rem' }}>Error: {ssrError}</div>
          ) : showRaw ? (
            <pre className="panel-raw">{ssrHtml}</pre>
          ) : (
            <iframe
              title="SSR Rendered"
              sandbox="allow-same-origin"
              srcDoc={ssrHtmlToRender}
              className="panel-iframe"
            />
          )}
        </section>
        <section className="panel panel-rendered">
          {renderedLoading ? (
            <div style={{ padding: '1rem' }}>Loading Rendered DOM...</div>
          ) : renderedError ? (
            <div style={{ color: 'red', padding: '1rem' }}>Error: {renderedError}</div>
          ) : showRaw ? (
            <pre className="panel-raw">{renderedHtml}</pre>
          ) : (
            <iframe
              title="Rendered DOM"
              sandbox="allow-same-origin"
              srcDoc={renderedHtmlToRender}
              className="panel-iframe"
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
