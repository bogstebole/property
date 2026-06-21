// Property-panel CSS, scoped inside the Web Component's Shadow DOM.
// Colors and states are the contract from SIDEBAR_SPEC.md §4.
export const PANEL_CSS = `
:host{all:initial}
*{box-sizing:border-box}
.wrap{font:11px/1.45 'Inter',-apple-system,system-ui,sans-serif;color:#EAEAEA}

/* ---- shell ---- */
.panel{position:fixed;top:0;right:0;height:100vh;width:264px;z-index:2147483641;
  background:#2C2C2C;border-left:1px solid #000;overflow-y:auto;
  transform:translateX(100%);transition:transform .18s ease}
.panel.open{transform:translateX(0)}
.panel::-webkit-scrollbar{width:9px}
.panel::-webkit-scrollbar-thumb{background:#454545;border-radius:5px;border:2px solid #2C2C2C}

/* ---- header / identity ---- */
.ident{padding:11px 12px 9px;border-bottom:1px solid #1B1B1B;position:sticky;top:0;background:#2C2C2C;z-index:3}
.ident .tagline{font:12px/1.3 'Roboto Mono',ui-monospace,monospace;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ident .tagline .cls{color:#4DA8FF}
.ident .crumb{font:10px/1.4 'Roboto Mono',ui-monospace,monospace;color:#7A7A7A;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ident .crumb b{color:#9C9C9C;font-weight:400}
.ident .crumb span{cursor:pointer}
.ident .crumb span:hover{color:#EAEAEA;text-decoration:underline}
.ident .selector{margin-top:6px;font:10px/1.3 'Roboto Mono',ui-monospace,monospace;color:#6E6E6E;
  background:#262626;border-radius:4px;padding:4px 6px;cursor:copy;word-break:break-all}
.ident .selector:hover{color:#9C9C9C}

/* ---- section ---- */
.sec{padding:10px 12px;border-bottom:1px solid #1B1B1B}
.sech{display:flex;align-items:center;gap:6px;height:18px;margin-bottom:8px}
.sech .t{font:600 11px/1 'Inter';color:#EAEAEA}
.sech .badge{font:600 9px/1 'Inter';color:#0D99FF;background:rgba(13,153,255,.15);border-radius:7px;padding:2px 5px}
.sech .add{margin-left:auto;color:#9C9C9C;cursor:pointer;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border-radius:4px}
.sech .add:hover{background:#3A3A3A;color:#fff}
.lbl{color:#8C8C8C;font-size:11px;margin:7px 0 4px}

/* ---- rows / fields ---- */
.row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:5px 0}
.row.one{grid-template-columns:1fr}
.field{display:flex;align-items:center;gap:5px;height:28px;padding:0 4px 0 7px;border-radius:5px;
  border:1px solid transparent;background:#383838;min-width:0;position:relative}
.field:hover{background:#4A4A4A}
.field:focus-within{background:#2C2C2C;border-color:#0D99FF}
.field .gl{color:#8C8C8C;font:10px/1 'Inter';flex:none;min-width:12px;text-align:center}
.field input{all:unset;flex:1;min-width:0;color:#EAEAEA;font:11px/1 'Inter'}
.field:hover input{color:#fff}
.field input::placeholder{color:#6E6E6E}
.field select.val{all:unset;flex:1;color:#EAEAEA;font:11px/1 'Inter';cursor:pointer}

/* modified */
.field.mod{border-left:2px solid #0D99FF;padding-left:6px}
.field.mod .gl{color:#5CC8FF}
.field.mod .revert{display:flex}
.revert{display:none;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;
  color:#9C9C9C;cursor:pointer;flex:none}
.revert:hover{background:#555;color:#fff}

/* bound (variable chip) */
.field.bound{background:rgba(13,153,255,.12)}
.field.bound:hover{background:rgba(13,153,255,.2)}
.field .dia{color:#0D99FF;flex:none;font-size:11px;line-height:1}
.field .tok{flex:1;min-width:0;color:#CFE6FF;font:11px/1 'Inter';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* empty / mixed value */
.field.empty input{color:#6E6E6E}
.field.mixed input{color:#8C8C8C;font-style:italic}

/* var picker (inline select acting as ◇) */
.varsel{all:unset;flex:none;color:#0D99FF;font-size:12px;cursor:pointer;width:16px;text-align:center}
.varsel:hover{color:#5CC8FF}

/* color / fill row */
.fill{display:flex;align-items:center;gap:7px;height:28px;padding:0 6px;border-radius:5px;background:#383838;border:1px solid transparent;position:relative}
.fill:hover{background:#4A4A4A}
.fill.bound{background:rgba(13,153,255,.12)}
.fill.mod{border-left:2px solid #0D99FF;padding-left:5px}
.fill .sw{width:16px;height:16px;border-radius:3px;border:1px solid rgba(255,255,255,.18);flex:none}
.fill .nm{flex:1;color:#EAEAEA;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fill.bound .nm{color:#CFE6FF}
.fill .pick{position:absolute;left:6px;width:16px;height:16px;opacity:0;cursor:pointer}

/* segmented */
.seg{display:flex;background:#383838;border-radius:6px;padding:2px;gap:2px}
.seg.mod{border-left:2px solid #0D99FF}
.seg button{flex:1;height:24px;display:flex;align-items:center;justify-content:center;background:none;border:none;
  border-radius:4px;color:#9C9C9C;cursor:pointer;font:10px/1 'Inter';padding:0 4px}
.seg button:hover{background:#4A4A4A;color:#fff}
.seg button.on{background:#0D99FF;color:#fff}

/* align grid */
.alirow{display:flex;gap:8px;align-items:flex-start}
.grid9{width:54px;height:54px;background:#383838;border-radius:6px;display:grid;
  grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);flex:none}
.grid9 i{display:flex;align-items:center;justify-content:center;cursor:pointer}
.grid9 i::before{content:"";width:4px;height:4px;border-radius:1px;background:#6A6A6A}
.grid9 i:hover::before{background:#fff}
.grid9 i.on::before{width:11px;height:3px;background:#0D99FF}
.alirow .col{flex:1;min-width:0}

/* spacing per-side */
.spacing-toggle{margin-left:auto;width:18px;height:18px;display:flex;align-items:center;justify-content:center;
  border-radius:4px;color:#9C9C9C;cursor:pointer}
.spacing-toggle:hover{background:#3A3A3A;color:#fff}
.spacing-toggle.on{background:#0D99FF;color:#fff}

/* checkbox */
.chk{display:flex;align-items:center;gap:7px;margin:8px 0 2px;color:#D4D4D4;cursor:pointer}
.chk input{accent-color:#0D99FF}

/* empty addable section */
.addrow{color:#7A7A7A;font-size:11px;padding:2px 0}

/* ---- footer ---- */
.foot{position:sticky;bottom:0;background:#262626;border-top:1px solid #1B1B1B;padding:9px 12px;display:flex;align-items:center;gap:8px}
.foot .count{font:11px/1 'Inter';color:#9C9C9C;display:flex;align-items:center;gap:6px;cursor:pointer}
.foot .count::before{content:"";width:6px;height:6px;border-radius:50%;background:#0D99FF}
.foot .count.zero{cursor:default}.foot .count.zero::before{background:#5A5A5A}
.foot .count:hover{color:#fff}
.foot .spacer{flex:1}
.foot .rs{height:28px;background:#383838;color:#D4D4D4;border:none;border-radius:6px;padding:0 10px;cursor:pointer;font:11px 'Inter'}
.foot .rs:hover{background:#4A4A4A}
.foot .cp{height:28px;background:#0D99FF;color:#fff;border:none;border-radius:6px;padding:0 12px;cursor:pointer;font:600 11px 'Inter';display:flex;align-items:center;gap:6px}
.foot .cp:hover{background:#3BA7FF}

/* ---- changes drawer ---- */
.drawer{position:fixed;right:264px;bottom:0;width:300px;max-height:60vh;z-index:2147483641;
  background:#262626;border:1px solid #1B1B1B;border-radius:8px 0 0 0;overflow:auto;box-shadow:-8px 0 24px rgba(0,0,0,.4)}
.drawer .dh{display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid #1B1B1B;position:sticky;top:0;background:#262626}
.drawer .dh .t{font:600 11px 'Inter';color:#fff}
.drawer .dh .x{margin-left:auto;cursor:pointer;color:#9C9C9C}
.drawer .grp{padding:8px 12px;border-bottom:1px solid #1B1B1B}
.drawer .grp .el{font:11px/1.3 'Roboto Mono',monospace;color:#4DA8FF;margin-bottom:5px}
.drawer .chg{display:flex;align-items:center;gap:6px;font:10px/1.4 'Roboto Mono',monospace;color:#B8B8B8;padding:2px 0}
.drawer .chg .p{color:#8C8C8C}
.drawer .chg .to{color:#CFE6FF}
.drawer .chg .rv{margin-left:auto;cursor:pointer;color:#7A7A7A}
.drawer .chg .rv:hover{color:#fff}
.drawer .dfoot{position:sticky;bottom:0;background:#262626;border-top:1px solid #1B1B1B;padding:9px 12px;display:flex;gap:8px}
.drawer .dfoot .rsa{flex:none;height:28px;background:#383838;color:#D4D4D4;border:none;border-radius:6px;padding:0 10px;cursor:pointer;font:11px 'Inter'}
.drawer .dfoot .cp{flex:1;height:28px;background:#0D99FF;color:#fff;border:none;border-radius:6px;cursor:pointer;font:600 11px 'Inter'}

/* ---- launcher ---- */
.launch{position:fixed;bottom:20px;right:20px;z-index:2147483642;cursor:pointer;background:#0D99FF;color:#fff;
  border:none;border-radius:7px;padding:9px 15px;font:600 12px 'Inter',system-ui;box-shadow:0 6px 20px rgba(13,153,255,.45);
  display:flex;align-items:center;gap:7px}
.launch.active{background:#2dd4a7}
`;
