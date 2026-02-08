/**
 * WhatsApp Chat Parser
 *
 * Parses a WhatsApp _chat.txt export into individual messages.
 * Does NOT try to detect amounts, currency, or classify expenses.
 * That is the user's job in the preview step.
 *
 * Tested against real Arabic/English WhatsApp group exports with:
 * - Mixed Arabic + English text
 * - Arabic-Indic numerals (٠-٩)
 * - RTL/LTR Unicode marks
 * - Multi-line messages
 * - Attached media references
 * - System messages
 */

export interface ParsedMessage {
  /** Sequential index starting from 0 */
  index: number;
  /** Date string "YYYY-MM-DD" from the WhatsApp timestamp */
  date: string;
  /** Time string "HH:MM:SS" from the WhatsApp timestamp */
  time: string;
  /** Sender display name exactly as it appears in the chat */
  sender: string;
  /** Full original message text including <attached:> tags */
  rawText: string;
  /** Cleaned text with <attached:> tags and "image omitted" stripped out — used as expense notes */
  displayText: string;
  /** True if message contained an attachment or "image/video/audio omitted" */
  hasMedia: boolean;
}

// WhatsApp timestamp format: [2025-10-08, 22:07:34] Sender: message
const TIMESTAMP_RE = /^\[(\d{4}-\d{2}-\d{2}),\s*(\d{2}:\d{2}:\d{2})\]\s+(.*)/;

// System messages to skip — these are not user-sent messages
const SYSTEM_PATTERNS = [
  "messages and calls are end-to-end encrypted",
  "you created group",
  "this message was deleted",
  "security code changed",
  "joined using this group",
  "left this group",
  "changed the group",
  "added you",
  "removed you",
  "changed the subject",
  "changed this group",
];

// Media attachment detection
const MEDIA_RE =
  /<attached:\s*[^>]+>|(?:image|video|audio|sticker|document|GIF)\s*omitted/i;

// Matches <attached: ...> tags and "X omitted" markers for stripping from display text
const MEDIA_STRIP_RE =
  /<attached:\s*[^>]+>/g;
const OMITTED_STRIP_RE =
  /(?:image|video|audio|sticker|document|GIF)\s*omitted/gi;

export function parseChat(raw: string): ParsedMessage[] {
  // 1. Strip BOM and Unicode directional/invisible marks
  let text = raw
    .replace(/\uFEFF/g, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u200B-\u200D]/g, "")
    .replace(/\r/g, "");

  const lines = text.split("\n");

  // 2. Parse messages with continuation line support
  interface RawMsg {
    date: string;
    time: string;
    sender: string;
    lines: string[];
  }

  const rawMessages: RawMsg[] = [];
  let current: RawMsg | null = null;

  for (const line of lines) {
    const match = line.match(TIMESTAMP_RE);

    if (match) {
      // Save previous message
      if (current) rawMessages.push(current);

      const [, date, time, rest] = match;
      const colonIdx = rest.indexOf(":");

      if (colonIdx === -1) {
        // No colon means system line (e.g. group name without sender), skip
        current = null;
        continue;
      }

      const sender = rest.substring(0, colonIdx).trim();
      const body = rest.substring(colonIdx + 1).trim();

      current = { date, time, sender, lines: [body] };
    } else {
      // Continuation line — append to current message
      if (current && line.trim()) {
        current.lines.push(line.trim());
      }
    }
  }

  // Don't forget the last message
  if (current) rawMessages.push(current);

  // 3. Build ParsedMessage array, filtering system messages
  const messages: ParsedMessage[] = [];
  let index = 0;

  for (const msg of rawMessages) {
    const rawText = msg.lines.join("\n").trim();

    // Skip system messages
    const lower = rawText.toLowerCase();
    if (SYSTEM_PATTERNS.some((p) => lower.includes(p))) continue;

    // Skip empty messages
    if (!rawText) continue;

    // Clean display text: strip media tags for use as expense notes
    const displayText = rawText
      .replace(MEDIA_STRIP_RE, "")
      .replace(OMITTED_STRIP_RE, "")
      .trim();

    messages.push({
      index,
      date: msg.date,
      time: msg.time,
      sender: msg.sender,
      rawText,
      displayText,
      hasMedia: MEDIA_RE.test(rawText),
    });

    index++;
  }

  return messages;
}

/**
 * Extract unique sender names from parsed messages.
 * Used by the sender mapping step.
 */
export function getUniqueSenders(messages: ParsedMessage[]): string[] {
  return [...new Set(messages.map((m) => m.sender))];
}
