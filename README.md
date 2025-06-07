# SSR vs DOM Viewer

A Chrome extension to visually compare the server-side rendered (SSR) HTML and the final rendered DOM of any web page, side by side.

## Features

- **Side-by-side comparison:** See the SSR (original) HTML and the Rendered (live) DOM in a full-screen, responsive UI.
- **Raw/Rendered toggle:** Switch between rendered view and raw HTML for both panels with a single global toggle.
- **Resource URL rewriting:** (Experimental) Automatically rewrite relative resource URLs to absolute, improving fidelity for images and styles.
- **Highlight differences:** (Experimental) Highlight elements that are new in the Rendered DOM (red border) or missing from the SSR DOM (dashed orange border).
- **Secure:** Uses sandboxed iframes; scripts in loaded HTML are never executed.
- **Works on all sites:** Just click the extension icon to open the comparison for the current page.

## Installation

1. Clone this repository:
   ```sh
   git clone https://github.com/RevenueHunt/ssr-vs-dom-viewer.git
   cd ssr-vs-dom-viewer
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Build the extension:
   ```sh
   npm run build
   ```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

## Usage

1. Navigate to any web page you want to inspect.
2. Click the SSR vs DOM Viewer extension icon in the Chrome toolbar.
3. A new tab will open, showing the SSR and Rendered DOM side by side.
4. Use the checkboxes in the header to:
   - Show raw HTML
   - Rewrite resource URLs (improves fidelity for images/styles)
   - Highlight differences (new/missing elements)

## Security

- All HTML is rendered in sandboxed iframes with scripts disabled.
- No scripts from the loaded HTML are executed.
- The extension does not collect or transmit any data.

## Development

- Built with [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vitejs.dev/).
- See `src/App.tsx` for the main UI and logic.
- See `public/manifest.json` for Chrome extension configuration.

## Roadmap / Ideas

- Visual diff for changed attributes or text content
- Export/share comparison results
- Keyboard shortcuts
- Options page for default settings

## License

MIT

---

**Made with ❤️ for web developers and QA engineers.**
