// Loads design-system components. Prefers the compiled bundle namespace (window.<NS>);
// falls back to fetching the .jsx sources and transpiling with Babel standalone.
const __dsRoot = (document.currentScript && document.currentScript.src || '').replace(/tools\/ds-loader\.js.*$/, '');
// Optional compiled bundle: probe first so a missing file never logs a script error.
const __dsBundle = fetch(__dsRoot + '_ds_bundle.js', { method: 'HEAD' }).then(r => r.ok ? new Promise(res => { const s = document.createElement('script'); s.src = __dsRoot + '_ds_bundle.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); }) : null).catch(() => null);
window.loadDS = async function loadDS(paths) {
  await __dsBundle;
  const isNS = v => { try { return v && typeof v === 'object' && !(v instanceof Window) && typeof v.Button === 'function' && typeof v.ProjectCard === 'function'; } catch (e) { return false; } };
  const ns = Object.keys(window).map(k => { try { return window[k]; } catch (e) { return null; } }).find(isNS);
  const reg = ns ? Object.assign({}, ns) : {};
  for (const p of paths) {
    const base = p.split('/').pop().replace(/\.jsx$/, '');
    if (reg[base] && !p.includes('ui_kits')) continue;
    let src = await (await fetch(p)).text();
    const names = [];
    src = src.replace(/^\s*import\s+React[^;]*;?/mg, '')
      .replace(/^\s*import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"];?/mg, (m, n) => 'const {' + n.replace(/\s+as\s+/g, ': ') + '} = __ds;')
      .replace(/^\s*export\s+(function|const)\s+([A-Za-z0-9_]+)/mg, (m, kw, name) => { names.push(name); return kw + ' ' + name; });
    const code = Babel.transform(src, { presets: [['react', { runtime: 'classic' }]], filename: p }).code;
    Object.assign(reg, new Function('React', '__ds', code + '\nreturn {' + names.join(',') + '};')(React, reg));
  }
  return reg;
};
