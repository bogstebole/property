// Figma-style panel CSS, scoped inside the Web Component's Shadow DOM.
export const PANEL_CSS = `
:host{all:initial}
*{box-sizing:border-box}
.wrap{font:11px/1.4 'Inter',-apple-system,system-ui,sans-serif;letter-spacing:.1px}
.panel{position:fixed;top:0;right:0;height:100vh;width:248px;z-index:2147483641;
  background:#1e1e1e;border-left:1px solid #000;color:#fff;overflow-y:auto;
  transform:translateX(100%);transition:transform .18s ease;user-select:none}
.panel.open{transform:translateX(0)}
.panel::-webkit-scrollbar{width:8px}.panel::-webkit-scrollbar-thumb{background:#444;border-radius:4px}
.head{display:flex;align-items:center;gap:6px;padding:10px;border-bottom:1px solid #383838;position:sticky;top:0;background:#1e1e1e;z-index:2}
.tag{font-weight:600;font-size:12px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tag b{color:#a78bfa}
.mod{margin-left:auto;font-size:10px;color:#000;background:#7dd3fc;padding:1px 6px;border-radius:4px;font-weight:600;flex:none}
.sel{padding:2px 10px 8px;border-bottom:1px solid #383838;font:10px/1.3 ui-monospace,monospace;color:#6b7280;background:#1e1e1e;word-break:break-all}
.sec{padding:10px;border-bottom:1px solid #2e2e2e}
.sech{display:flex;align-items:center;height:20px;margin-bottom:8px}
.sech .t{font-size:11px;font-weight:600;color:#fff}
.lbl{color:#8a8a8a;font-size:11px;margin:8px 0 5px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:5px 0}
.row.one{grid-template-columns:1fr}
.fld{display:flex;align-items:center;gap:5px;height:28px;padding:0 7px;border-radius:5px;border:1px solid transparent;background:#2c2c2c;min-width:0}
.fld:hover{border-color:#4a4a4a}
.fld:focus-within{border-color:#0d99ff;background:#1e1e1e}
.fld .gl{color:#8a8a8a;font-size:11px;flex:none;min-width:12px;text-align:center;font-weight:500}
.fld input{all:unset;flex:1;min-width:0;color:#fff;font:11px/1 inherit;font-family:inherit}
.fld select{all:unset;flex:1;color:#fff;font:11px inherit;cursor:pointer}
.tokchip{font-size:9px;color:#a78bfa;background:#2a2440;border-radius:3px;padding:1px 4px;flex:none}
.fill{display:flex;align-items:center;gap:7px;height:28px;padding:0 7px;border-radius:5px;background:#2c2c2c;border:1px solid transparent;position:relative}
.fill:hover{border-color:#4a4a4a}
.fill .sw{width:16px;height:16px;border-radius:3px;border:1px solid rgba(255,255,255,.15);flex:none}
.fill .nm{flex:1;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fill .picker{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}
.foot{position:sticky;bottom:0;background:#1e1e1e;border-top:1px solid #383838;padding:10px;display:flex;gap:6px}
.foot .cp{flex:1;height:30px;background:#0d99ff;color:#fff;border:none;border-radius:6px;font:600 11px inherit;cursor:pointer}
.foot .cp:hover{background:#3b9bff}
.foot .rs{height:30px;background:#2c2c2c;color:#d4d4d4;border:none;border-radius:6px;padding:0 12px;cursor:pointer}
.foot .rs:hover{background:#383838}
.launch{position:fixed;bottom:20px;right:20px;z-index:2147483642;cursor:pointer;background:#0d99ff;color:#fff;
  border:none;border-radius:6px;padding:9px 16px;font:600 12px system-ui;box-shadow:0 6px 20px rgba(13,153,255,.45);
  display:flex;align-items:center;gap:7px}
.launch.active{background:#2dd4a7}
`;
