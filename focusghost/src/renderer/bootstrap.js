const isElectronRenderer = typeof window !== 'undefined' && typeof window.api !== 'undefined';

async function redirectToLivePreview() {
  const candidatePorts = [5173, 5174, 5175, 5176];

  for (const port of candidatePorts) {
    const origin = `http://localhost:${port}`;
    try {
      const res = await fetch(`${origin}/`, { method: 'HEAD', mode: 'cors', cache: 'no-store' });
      if (res.ok) {
        window.location.replace(origin);
        return true;
      }
    } catch {
      // Keep probing nearby Vite ports.
    }
  }

  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b1014;color:#e8eef2;font-family:'JetBrains Mono',ui-monospace,monospace;">
        <div style="max-width:560px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;background:#10171d;">
          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#9aa5af;margin-bottom:12px;">FocusGhost Preview</div>
          <div style="font-size:15px;line-height:1.6;">
            This source file is not meant to run directly over <code>file://</code>.<br />
            Start the dev app with <code>npm run dev</code> and open the local preview URL instead.
          </div>
        </div>
      </div>
    `;
  }

  return false;
}

if (window.location.protocol === 'file:' && !isElectronRenderer) {
  await redirectToLivePreview();
} else {
  await import('./main.ts');
}
