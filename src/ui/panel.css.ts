// Property-panel CSS, scoped inside the Web Component's Shadow DOM.
// Colors and states are the contract from SIDEBAR_SPEC.md §4.
// Inter + Roboto Mono are loaded so the panel looks identical regardless of
// whether the host machine has them installed.
const FONT_STACK = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif";

export const PANEL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap');
:host{all:initial;font-family:${FONT_STACK}}
*{box-sizing:border-box}
.wrap{font-family:${FONT_STACK};font-size:11px;line-height:1.45;color:#EAEAEA}

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
.field.sel .selval{flex:1;min-width:0;color:#EAEAEA;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.field.sel .chev{flex:none;color:#8C8C8C;font-size:9px}
.field.sel:hover .chev{color:#fff}
.seldrop{position:fixed;z-index:2147483643;background:#2C2C2C;border:1px solid #1B1B1B;border-radius:6px;
  box-shadow:0 10px 30px rgba(0,0,0,.5);padding:4px;max-height:220px;overflow-y:auto;font-family:${FONT_STACK};font-size:11px}
.seldrop-it{height:26px;display:flex;align-items:center;padding:0 8px;border-radius:4px;color:#EAEAEA;cursor:pointer}
.seldrop-it:hover{background:#383838}
.seldrop-it.on{color:#0D99FF}
.seldrop-it.on::after{content:"✓";margin-left:auto;color:#0D99FF}

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

/* ◇ button that opens the variables popover */
.diabtn{flex:none;color:#0D99FF;font-size:12px;line-height:1;cursor:pointer;padding:0 3px;border-radius:3px}
.diabtn:hover{background:rgba(13,153,255,.2);color:#5CC8FF}

/* color / fill row */
.fill{display:flex;align-items:center;gap:7px;height:28px;padding:0 6px;border-radius:5px;background:#383838;border:1px solid transparent;position:relative}
.fill:hover{background:#4A4A4A}
.fill.bound{background:rgba(13,153,255,.12)}
.fill.mod{border-left:2px solid #0D99FF;padding-left:5px}
.fill .sw{width:16px;height:16px;border-radius:3px;border:1px solid rgba(255,255,255,.18);flex:none}
.fill .nm{flex:1;color:#EAEAEA;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fill.bound .nm{color:#CFE6FF}
.fill .dia{color:#0D99FF;cursor:pointer;flex:none;font-size:12px;line-height:1;padding:0 2px;border-radius:3px}
.fill .dia:hover{background:rgba(13,153,255,.2)}

/* segmented */
.seg{display:flex;background:#383838;border-radius:6px;padding:2px;gap:2px}
.seg.mod{border-left:2px solid #0D99FF}
.seg button{flex:1;height:24px;display:flex;align-items:center;justify-content:center;background:none;border:none;
  border-radius:4px;color:#9C9C9C;cursor:pointer;font:10px/1 'Inter';padding:0 4px}
.seg button:hover{background:#4A4A4A;color:#fff}
.seg button.on{background:#0D99FF;color:#fff}

/* flow: direction arrows + wrap toggle */
.flow{display:flex;gap:6px;margin:5px 0}
.flow .dir{display:flex;flex:1;background:#383838;border-radius:6px;padding:2px;gap:2px}
.flow .dir button{flex:1;height:24px;display:flex;align-items:center;justify-content:center;background:none;border:none;border-radius:4px;color:#9C9C9C;cursor:pointer}
.flow .dir button:hover{background:#4A4A4A;color:#fff}
.flow .dir button.on{background:#0D99FF;color:#fff}
.flow .wrapbtn{width:34px;height:28px;display:flex;align-items:center;justify-content:center;background:#383838;border:none;border-radius:6px;color:#9C9C9C;cursor:pointer}
.flow .wrapbtn:hover{background:#4A4A4A;color:#fff}
.flow .wrapbtn.on{background:#0D99FF;color:#fff}

/* gear / individual toggle inline at end of a row */
.gear{width:28px;height:28px;flex:none;display:flex;align-items:center;justify-content:center;background:#383838;border:none;border-radius:5px;color:#9C9C9C;cursor:pointer}
.gear:hover{background:#4A4A4A;color:#fff}
.gear.on{background:#0D99FF;color:#fff}
.row.with-gear{grid-template-columns:1fr 1fr 28px}

/* checkbox */
.chk{display:flex;align-items:center;gap:7px;margin:8px 0 2px;color:#D4D4D4;cursor:pointer}
.chk input{accent-color:#0D99FF}

/* empty addable section */
.addrow{color:#7A7A7A;font-size:11px;padding:2px 0}

/* ---- footer (wraps to stack when it can't fit inline) ---- */
.foot{position:sticky;bottom:0;background:#262626;border-top:1px solid #1B1B1B;padding:9px 12px;
  display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:flex-end}
.foot .count{font-size:11px;color:#9C9C9C;display:flex;align-items:center;gap:6px;cursor:pointer;flex:1 1 auto;margin-right:auto}
.foot .count::before{content:"";width:6px;height:6px;border-radius:50%;background:#0D99FF;flex:none}
.foot .count.zero{cursor:default}.foot .count.zero::before{background:#5A5A5A}
.foot .count:hover{color:#fff}
.foot .rs{height:28px;background:#383838;color:#D4D4D4;border:none;border-radius:6px;padding:0 10px;cursor:pointer;font-size:11px;white-space:nowrap}
.foot .rs:hover{background:#4A4A4A}
.foot .cp{height:28px;background:#0D99FF;color:#fff;border:none;border-radius:6px;padding:0 12px;cursor:pointer;font-weight:600;font-size:11px;display:flex;align-items:center;gap:6px;white-space:nowrap}
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

/* ---- color picker popover ---- */
.cpick{position:fixed;right:272px;width:236px;z-index:2147483643;background:#2C2C2C;border:1px solid #1B1B1B;
  border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.5);padding:10px;color:#EAEAEA;
  font-family:${FONT_STACK};font-size:11px}
.cp-head{display:flex;align-items:center;height:22px;margin-bottom:8px}
.cp-title{font-weight:600;color:#fff}
.cp-x{margin-left:auto;cursor:pointer;color:#9C9C9C;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border-radius:4px}
.cp-x:hover{background:#3A3A3A;color:#fff}
.cp-tabs{display:flex;background:#1E1E1E;border-radius:7px;padding:2px;gap:2px;margin-bottom:10px}
.cp-tabs button{flex:1;height:24px;border:none;background:none;color:#9C9C9C;border-radius:5px;cursor:pointer;font-size:11px;font-family:inherit}
.cp-tabs button.on{background:#3A3A3A;color:#fff}
.cp-sv{position:relative;width:100%;height:140px;border-radius:6px;cursor:crosshair;touch-action:none;overflow:hidden}
.cp-thumb{position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4);transform:translate(-50%,-50%);pointer-events:none}
.cp-row{display:flex;align-items:center;gap:8px;margin-top:10px}
.cp-eye{width:24px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#9C9C9C;font-size:14px}
.cp-eye:hover{color:#fff}
.cp-hue{position:relative;flex:1;height:12px;border-radius:6px;cursor:pointer;touch-action:none;
  background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}
.cp-alpha{position:relative;height:12px;border-radius:6px;margin-top:10px;cursor:pointer;touch-action:none;
  background:linear-gradient(to right,rgba(var(--c),0),rgb(var(--c))),
    repeating-conic-gradient(#666 0 25%,#999 0 50%) 0/10px 10px}
.cp-slthumb{position:absolute;top:50%;width:14px;height:14px;border-radius:50%;background:#fff;
  border:1px solid rgba(0,0,0,.3);transform:translate(-50%,-50%);pointer-events:none}
.cp-foot{display:flex;gap:6px;margin-top:10px}
.cp-fmt{display:flex;align-items:center;color:#9C9C9C;padding:0 4px}
.cp-hex{flex:1;min-width:0;height:26px;background:#383838;border:1px solid transparent;border-radius:5px;
  color:#EAEAEA;padding:0 7px;font-family:'Roboto Mono',monospace;font-size:11px;text-transform:uppercase}
.cp-hex:focus{outline:none;border-color:#0D99FF;background:#2C2C2C}
.cp-ap{width:48px;height:26px;background:#383838;border:1px solid transparent;border-radius:5px;color:#EAEAEA;padding:0 6px;font-size:11px;font-family:inherit}
.cp-ap:focus{outline:none;border-color:#0D99FF;background:#2C2C2C}
.cp-docs{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;padding-top:10px;border-top:1px solid #1B1B1B}
.cp-docsw{width:18px;height:18px;border-radius:4px;border:1px solid rgba(255,255,255,.15);cursor:pointer}
.cp-docsw:hover{transform:scale(1.1)}
.cp-search{width:100%;height:28px;background:#383838;border:1px solid transparent;border-radius:6px;color:#EAEAEA;padding:0 8px;font-size:11px;font-family:inherit;margin-bottom:8px}
.cp-search:focus{outline:none;border-color:#0D99FF;background:#2C2C2C}
.cp-vars{max-height:220px;overflow-y:auto}
.cp-vgroup{font-size:9px;font-weight:600;color:#7A7A7A;letter-spacing:.5px;margin:8px 2px 4px}
.cp-vrow{display:flex;align-items:center;gap:8px;height:28px;padding:0 6px;border-radius:5px;cursor:pointer}
.cp-vrow:hover{background:#383838}
.cp-vsw{width:16px;height:16px;border-radius:3px;border:1px solid rgba(255,255,255,.15);flex:none}
.cp-vname{color:#EAEAEA;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-empty{color:#7A7A7A;padding:10px 4px;text-align:center}
.cp-detach{display:flex;align-items:center;gap:7px;height:28px;padding:0 6px;border-radius:5px;cursor:pointer;color:#FF8A8A;margin-bottom:4px;border-bottom:1px solid #1B1B1B}
.cp-detach:hover{background:#383838}
.cp-check{margin-left:auto;color:#0D99FF;flex:none}
.vpop{width:220px}

/* ---- launcher ---- */
.launch{position:fixed;bottom:20px;right:20px;z-index:2147483642;cursor:pointer;background:#0D99FF;color:#fff;
  border:none;border-radius:7px;padding:9px 15px;font:600 12px 'Inter',system-ui;box-shadow:0 6px 20px rgba(13,153,255,.45);
  display:flex;align-items:center;gap:7px}
.launch.active{background:#2dd4a7}
`;
