/**
 * Minimal Markdown → HTML for legal docs (headings, lists, bold, links, tables, paragraphs).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function inlineFormat(s: string): string {
  let t = escapeHtml(s)
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  t = t.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
  return t
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const out: string[] = []
  let i = 0
  let inUl = false
  let inTable = false
  let tableHeaderDone = false

  const closeUl = () => {
    if (inUl) {
      out.push("</ul>")
      inUl = false
    }
  }

  const closeTable = () => {
    if (inTable) {
      out.push("</tbody></table>")
      inTable = false
      tableHeaderDone = false
    }
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === "") {
      closeUl()
      closeTable()
      i++
      continue
    }

    if (trimmed.startsWith("|") && trimmed.includes("|", 1)) {
      closeUl()
      if (!inTable) {
        inTable = true
        tableHeaderDone = false
        out.push('<table class="legal-table">')
      }
      const isSep = /^\|[\s\-:|]+\|/.test(trimmed) && /-/.test(trimmed)
      if (isSep) {
        i++
        continue
      }
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
      const tag = !tableHeaderDone ? "th" : "td"
      if (!tableHeaderDone) {
        out.push("<thead><tr>")
        for (const c of cells) {
          out.push(`<${tag}>${inlineFormat(c)}</${tag}>`)
        }
        out.push("</tr></thead><tbody>")
        tableHeaderDone = true
      } else {
        out.push("<tr>")
        for (const c of cells) {
          out.push(`<td>${inlineFormat(c)}</td>`)
        }
        out.push("</tr>")
      }
      i++
      continue
    } else {
      closeTable()
    }

    if (trimmed.startsWith("# ")) {
      closeUl()
      out.push(`<h1>${inlineFormat(trimmed.slice(2))}</h1>`)
      i++
      continue
    }
    if (trimmed.startsWith("## ")) {
      closeUl()
      out.push(`<h2>${inlineFormat(trimmed.slice(3))}</h2>`)
      i++
      continue
    }
    if (trimmed.startsWith("### ")) {
      closeUl()
      out.push(`<h3>${inlineFormat(trimmed.slice(4))}</h3>`)
      i++
      continue
    }
    if (trimmed.startsWith("- ")) {
      if (!inUl) {
        out.push("<ul>")
        inUl = true
      }
      out.push(`<li>${inlineFormat(trimmed.slice(2))}</li>`)
      i++
      continue
    }

    closeUl()
    out.push(`<p>${inlineFormat(trimmed)}</p>`)
    i++
  }

  closeUl()
  closeTable()
  return out.join("\n")
}

export function wrapLegalPage(title: string, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — PromptVault</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.55; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; margin-top: 1.75rem; }
    h3 { font-size: 1.05rem; margin-top: 1.25rem; }
    p { margin: 0.75rem 0; }
    ul { padding-left: 1.25rem; }
    table.legal-table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.9rem; }
    table.legal-table th, table.legal-table td { border: 1px solid #8884; padding: 0.4rem 0.5rem; text-align: left; }
    a { color: inherit; }
  </style>
</head>
<body>
<article>
${innerHtml}
</article>
</body>
</html>`
}
