export interface ParsedMessage {
  date: string;
  time: string;
  sender: string;
  text: string;
  mediaFilename: string | null;
  hasMedia: boolean;
  hash: string;
}

// Simple hash from string
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// System/noise lines to ignore
const SYSTEM_PATTERNS = [
  /messages and calls are end-to-end encrypted/i,
  /created group/i,
  /added you/i,
  /changed the subject/i,
  /changed this group/i,
  /changed the group/i,
  /left$/i,
  /removed$/i,
  /joined using this group/i,
  /security code changed/i,
  /this message was deleted/i,
  /you deleted this message/i,
  /message was deleted/i,
  /waiting for this message/i,
];

// WhatsApp timestamp patterns
const TIMESTAMP_REGEX = /^\[(\d{4}-\d{2}-\d{2}),?\s+(\d{2}:\d{2}:\d{2})\]\s+(.+?):\s(.*)$/;
const TIMESTAMP_REGEX_ALT = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]?\s*[-–]\s*(.+?):\s(.*)$/i;

const ATTACHED_FILE = /<attached:\s*(.+?)>/i;

function normalizeAltDate(dateStr: string, timeStr: string): { date: string; time: string } {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    let [a, b, c] = parts;
    let year = parseInt(c);
    if (year < 100) year += 2000;
    const month = b.padStart(2, "0");
    const day = a.padStart(2, "0");

    const timeParts = timeStr.replace(/\s*[AP]M/i, "").split(":");
    let hours = parseInt(timeParts[0]);
    const minutes = timeParts[1]?.padStart(2, "0") || "00";
    const seconds = timeParts[2]?.padStart(2, "0") || "00";
    if (/PM/i.test(timeStr) && hours !== 12) hours += 12;
    if (/AM/i.test(timeStr) && hours === 12) hours = 0;

    return {
      date: `${year}-${month}-${day}`,
      time: `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`,
    };
  }
  return { date: dateStr, time: timeStr };
}

export function parseChat(text: string): ParsedMessage[] {
  // Strip BOM and Unicode direction/zero-width marks
  text = text.replace(/^\uFEFF/, "");
  text = text.replace(/[\u200B-\u200F\u202A-\u202E]/g, "");

  const lines = text.split("\n");
  const messages: ParsedMessage[] = [];
  let current: { date: string; time: string; sender: string; lines: string[] } | null = null;

  const flushCurrent = () => {
    if (!current) return;
    const fullText = current.lines.join("\n").trim();
    if (!fullText) { current = null; return; }

    const isSystem = SYSTEM_PATTERNS.some((p) => p.test(fullText));
    if (isSystem) { current = null; return; }

    const attachedMatch = ATTACHED_FILE.exec(fullText);
    const mediaFilename = attachedMatch?.[1] || null;
    const hasMedia = !!mediaFilename;

    const hash = simpleHash(`${current.date}T${current.time}|${current.sender}|${fullText}`);

    messages.push({
      date: current.date,
      time: current.time,
      sender: current.sender,
      text: fullText,
      mediaFilename,
      hasMedia,
      hash,
    });
    current = null;
  };

  for (const line of lines) {
    let match = TIMESTAMP_REGEX.exec(line);
    if (match) {
      flushCurrent();
      current = { date: match[1], time: match[2], sender: match[3].trim(), lines: [match[4]] };
      continue;
    }

    match = TIMESTAMP_REGEX_ALT.exec(line);
    if (match) {
      flushCurrent();
      const normalized = normalizeAltDate(match[1], match[2]);
      current = { date: normalized.date, time: normalized.time, sender: match[3].trim(), lines: [match[4]] };
      continue;
    }

    // Continuation line
    if (current) {
      current.lines.push(line);
    }
  }
  flushCurrent();

  return messages;
}
