/**
 * Prompts carry user and document text inside XML-like tags, and the model is told never to follow
 * instructions found inside them. These helpers are the only way such text enters a prompt, so it can't
 * close its block early or break out of an attribute and pose as instructions.
 */

/** Anything shaped like a closing tag, which could end a block early. */
const CLOSING_TAG = /<\/\s*[\w-]+\s*>/g;
const LINE_BREAKS = /\s*[\r\n]+\s*/g;

/** Removes closing tags from text that goes inside a tagged block. */
export function sanitizeTagContent(text: string): string {
  return text.replace(CLOSING_TAG, "");
}

/** Makes a value safe inside a double-quoted attribute on one line. */
export function escapeAttribute(value: string): string {
  return value.replace(LINE_BREAKS, " ").replace(/"/g, "'").replace(/</g, "‹").replace(/>/g, "›");
}

function openingTag(tag: string, attributes: Record<string, string>): string {
  const rendered = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
  return `<${tag}${rendered}>`;
}

/** Untrusted text (a document, a user's field, a library excerpt) in its own block. */
export function taggedBlock(tag: string, text: string, attributes: Record<string, string> = {}): string {
  return `${openingTag(tag, attributes)}\n${sanitizeTagContent(text)}\n</${tag}>`;
}

/** A block that groups blocks already built with taggedBlock (e.g. <fontes> around each <fonte>). */
export function blockGroup(tag: string, blocks: string[], separator = "\n"): string {
  return `<${tag}>\n${blocks.join(separator)}\n</${tag}>`;
}
