import { useEffect, useRef } from "react";
import bodyHtml from "@/symmetry/body.html?raw";
import appScript from "@/symmetry/app.js?raw";
import "@/symmetry/symmetry.css";

const CDN_LIBS = [
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js",
  "https://cdn.jsdelivr.net/npm/pouchdb-adapter-idb@8.0.1/dist/pouchdb.idb.min.js",
  "https://cdn.jsdelivr.net/npm/@scure/bip39@1.2.1/dist/bip39.bundle.min.js",
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[data-sym-lib="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.dataset.symLib = src;
    // Continue even if a CDN dependency fails — the app has graceful fallbacks.
    el.onload = () => resolve();
    el.onerror = () => resolve();
    document.head.appendChild(el);
  });
}

/**
 * Hosts the ported Symmetry dashboard. The original app is an imperative,
 * DOM-driven single page (getElementById + inline handlers), so we mount its
 * markup, load its libraries, run its logic once, then replay the lifecycle
 * events its init code listens for.
 */
export default function SymmetryDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = bodyHtml;

    let cancelled = false;

    (async () => {
      for (const src of CDN_LIBS) {
        await loadScript(src);
      }
      if (cancelled) return;

      // Run the original application logic in global scope so its top-level
      // function declarations and inline onclick handlers resolve on window.
      const script = document.createElement("script");
      script.id = "symmetry-app-script";
      script.textContent = appScript;
      document.body.appendChild(script);

      // The original code wires initialisation through DOMContentLoaded / load,
      // which already fired before injection — replay them so init runs.
      requestAnimationFrame(() => {
        document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
        window.dispatchEvent(new Event("load"));
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={containerRef} className="symmetry-app" />;
}
