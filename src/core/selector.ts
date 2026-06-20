// Robust-ish selector generation for the handoff prompt. The selector is
// context for a human/agent, not a guaranteed-unique runtime query — always
// pair it with element context (tag, classes, text).

const TOOL_CLASS_PREFIX = "vqi-";

export function buildSelector(el: HTMLElement): string {
  if (el.id) return "#" + el.id;

  const path: string[] = [];
  let node: HTMLElement | null = el;

  while (node && node.nodeType === 1 && node !== document.body) {
    let part = node.tagName.toLowerCase();
    const classes = [...node.classList].filter((c) => !c.startsWith(TOOL_CLASS_PREFIX)).slice(0, 2);
    if (classes.length) part += "." + classes.join(".");

    const parent: HTMLElement | null = node.parentElement;
    if (parent) {
      const sameTag = [...parent.children].filter((c) => c.tagName === node!.tagName);
      if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
    }

    path.unshift(part);
    if (node.id) {
      path[0] = "#" + node.id;
      break;
    }
    node = parent;
  }

  return path.join(" > ");
}

export interface ElementContext {
  tag: string;
  classes: string[];
  text: string;
}

export function elementContext(el: HTMLElement): ElementContext {
  return {
    tag: el.tagName.toLowerCase(),
    classes: [...el.classList].filter((c) => !c.startsWith(TOOL_CLASS_PREFIX)),
    text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
  };
}
