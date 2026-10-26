import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";

for (const [name, language] of Object.entries({ javascript, python, json, bash, sql, xml, css })) {
  hljs.registerLanguage(name, language);
}

const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
md.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index];
  const language = token.info.trim().split(/\s+/)[0] || "text";
  let code = md.utils.escapeHtml(token.content);
  if (hljs.getLanguage(language)) {
    try { code = hljs.highlight(token.content, { language, ignoreIllegals: true }).value; }
    catch { /* Incomplete streaming code remains readable as escaped plain text. */ }
  }
  return `<div class="code-block"><div class="code-block-toolbar"><span>${md.utils.escapeHtml(language)}</span><button type="button" data-copy-code>复制代码</button></div><pre><code class="hljs">${code}</code></pre></div>\n`;
};
md.renderer.rules.table_open = () => '<div class="table-scroll" tabindex="0" role="region" aria-label="数据表格"><table>\n';
md.renderer.rules.table_close = () => "</table></div>\n";
const defaultLinkOpen = md.renderer.rules.link_open || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));
md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, index, options, env, self);
};

export function renderMarkdown(text = "") {
  // Sanitize after highlighting and adding UI wrappers; raw HTML stays disabled.
  return DOMPurify.sanitize(md.render(String(text || "")), { ADD_ATTR: ["target"] });
}
