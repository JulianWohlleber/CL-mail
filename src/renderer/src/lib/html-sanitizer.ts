import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'a', 'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'hr', 'sub', 'sup', 'small'
]

const ALLOWED_ATTRS = [
  'href', 'src', 'alt', 'title', 'width', 'height',
  'style', 'class', 'align', 'valign', 'colspan', 'rowspan',
  'border', 'cellpadding', 'cellspacing', 'bgcolor', 'color',
  'dir', 'lang'
]

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  })
}
