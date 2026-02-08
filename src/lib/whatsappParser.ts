export interface ParsedMessage {
  timestamp: Date;
  sender: string;
  text: string;
  isMedia: boolean;
  mediaType?: "image" | "video" | "audio" | "document";
  attachedFilename?: string; // from "<attached: filename.jpg>"
  hash: string;
}

export interface MediaEvent {
  timestamp: Date;
  sender: string;
  mediaType: string;
  attachedFilename?: string;
}

export interface ExpenseCandidate {
  message: ParsedMessage;
  amountEgp: number;
  needsReview: boolean;
  isTotalLine: boolean;
  excluded: boolean;
  category?: string;
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

export function generateMessageHash(timestamp: Date, sender: string, text: string): string {
  return simpleHash(`${timestamp.toISOString()}|${sender}|${text}`);
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
  /\+\d{1,4}\s?\d+/,  // phone number only messages
];

// WhatsApp timestamp pattern: [YYYY-MM-DD, HH:MM:SS] or [DD/MM/YYYY, HH:MM:SS] or similar
const TIMESTAMP_REGEX = /^\[(\d{4}-\d{2}-\d{2}),?\s+(\d{2}:\d{2}:\d{2})\]\s+(.+?):\s(.*)$/;
// Also handle: DD/MM/YYYY, H:MM:SS AM/PM format
const TIMESTAMP_REGEX_ALT = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]?\s*[-–]\s*(.+?):\s(.*)$/i;

const MEDIA_OMITTED = /(image omitted|video omitted|audio omitted|sticker omitted|document omitted|GIF omitted)/i;
const ATTACHED_FILE = /<attached:\s*(.+?)>/i;

// Currency hints for expense detection
const CURRENCY_HINTS = /(?:ج|جنيه|EGP|LE|egp|le)/i;
// Arabic and English numbers with optional commas/dots
const NUMBER_PATTERN = /[\d٠-٩][,،\d٠-٩]*\.?\d*/g;

// Total/summary keywords to exclude by default
const TOTAL_KEYWORDS = /(?:اجمالي|اجمال|الحساب|المجموع|total|subtotal|grand total)/i;

function parseArabicNumber(str: string): number {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  let result = str;
  for (let i = 0; i < arabicDigits.length; i++) {
    result = result.replace(new RegExp(arabicDigits[i], "g"), String(i));
  }
  result = result.replace(/[,،]/g, "");
  return parseFloat(result) || 0;
}

function parseTimestamp(dateStr: string, timeStr: string): Date | null {
  try {
    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(`${dateStr}T${timeStr}`);
    }
    // Try DD/MM/YYYY or M/D/YY
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      let [a, b, c] = parts;
      let year = parseInt(c);
      if (year < 100) year += 2000;
      // Assume DD/MM/YYYY
      const month = parseInt(b) - 1;
      const day = parseInt(a);
      const timeParts = timeStr.replace(/\s*[AP]M/i, "").split(":");
      let hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      const seconds = parseInt(timeParts[2] || "0");
      if (/PM/i.test(timeStr) && hours !== 12) hours += 12;
      if (/AM/i.test(timeStr) && hours === 12) hours = 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }
    return null;
  } catch {
    return null;
  }
}

export function parseChat(text: string): { messages: ParsedMessage[]; mediaEvents: MediaEvent[] } {
  const lines = text.split("\n");
  const messages: ParsedMessage[] = [];
  const mediaEvents: MediaEvent[] = [];
  let current: { timestamp: Date; sender: string; lines: string[] } | null = null;

  const flushCurrent = () => {
    if (!current) return;
    const fullText = current.lines.join("\n").trim();
    if (!fullText) return;

    const isSystem = SYSTEM_PATTERNS.some((p) => p.test(fullText));
    if (isSystem) { current = null; return; }

    const mediaOmit = MEDIA_OMITTED.exec(fullText);
    const attachedMatch = ATTACHED_FILE.exec(fullText);
    const isMedia = !!mediaOmit || !!attachedMatch;

    let mediaType: ParsedMessage["mediaType"];
    if (mediaOmit) {
      const t = mediaOmit[1].toLowerCase();
      if (t.includes("image") || t.includes("sticker") || t.includes("gif")) mediaType = "image";
      else if (t.includes("video")) mediaType = "video";
      else if (t.includes("audio")) mediaType = "audio";
      else mediaType = "document";
    }
    if (attachedMatch) {
      const fn = attachedMatch[1].toLowerCase();
      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(fn)) mediaType = "image";
      else if (/\.(mp4|mov|avi)$/i.test(fn)) mediaType = "video";
      else if (/\.(mp3|ogg|opus|wav|m4a)$/i.test(fn)) mediaType = "audio";
      else mediaType = "document";
    }

    if (isMedia) {
      mediaEvents.push({
        timestamp: current.timestamp,
        sender: current.sender,
        mediaType: mediaType || "image",
        attachedFilename: attachedMatch?.[1],
      });
    }

    const hash = generateMessageHash(current.timestamp, current.sender, fullText);
    messages.push({
      timestamp: current.timestamp,
      sender: current.sender,
      text: fullText,
      isMedia,
      mediaType,
      attachedFilename: attachedMatch?.[1],
      hash,
    });
  };

  for (const line of lines) {
    let match = TIMESTAMP_REGEX.exec(line);
    if (match) {
      flushCurrent();
      const ts = parseTimestamp(match[1], match[2]);
      if (ts) {
        current = { timestamp: ts, sender: match[3].trim(), lines: [match[4]] };
      }
      continue;
    }

    match = TIMESTAMP_REGEX_ALT.exec(line);
    if (match) {
      flushCurrent();
      const ts = parseTimestamp(match[1], match[2]);
      if (ts) {
        current = { timestamp: ts, sender: match[3].trim(), lines: [match[4]] };
      }
      continue;
    }

    // Continuation line
    if (current) {
      current.lines.push(line);
    }
  }
  flushCurrent();

  return { messages, mediaEvents };
}

export function detectExpenses(messages: ParsedMessage[]): ExpenseCandidate[] {
  const candidates: ExpenseCandidate[] = [];

  for (const msg of messages) {
    if (msg.isMedia && !msg.text.replace(MEDIA_OMITTED, "").replace(ATTACHED_FILE, "").trim()) continue;

    const textToCheck = msg.text;
    if (!CURRENCY_HINTS.test(textToCheck)) continue;

    const numbers = textToCheck.match(NUMBER_PATTERN);
    if (!numbers || numbers.length === 0) continue;

    const amounts = numbers.map(parseArabicNumber).filter((n) => n > 0);
    if (amounts.length === 0) continue;

    const isTotalLine = TOTAL_KEYWORDS.test(textToCheck);
    const needsReview = amounts.length > 1;

    // Pick the largest amount as the likely expense amount
    const amountEgp = Math.max(...amounts);

    candidates.push({
      message: msg,
      amountEgp,
      needsReview,
      isTotalLine,
      excluded: isTotalLine, // exclude totals by default
    });
  }

  return candidates;
}

export interface ReceiptMatch {
  mediaFilename: string;
  confidence: "high" | "medium" | "low";
  mediaEvent: MediaEvent;
}

export function matchReceiptsToExpenses(
  candidates: ExpenseCandidate[],
  mediaEvents: MediaEvent[],
  mediaFiles: Map<string, File>, // filename -> File
  senderMapping: Map<string, string> // whatsapp name -> partner name
): Map<number, ReceiptMatch | null> {
  const matches = new Map<number, ReceiptMatch | null>();
  const usedMedia = new Set<string>();

  // First pass: handle "<attached: filename>" references
  candidates.forEach((candidate, idx) => {
    if (candidate.message.attachedFilename) {
      const fn = candidate.message.attachedFilename;
      if (mediaFiles.has(fn)) {
        matches.set(idx, {
          mediaFilename: fn,
          confidence: "high",
          mediaEvent: {
            timestamp: candidate.message.timestamp,
            sender: candidate.message.sender,
            mediaType: "image",
            attachedFilename: fn,
          },
        });
        usedMedia.add(fn);
      }
    }
  });

  // Second pass: match by timestamp proximity + sender
  const imageEvents = mediaEvents.filter(
    (e) => e.mediaType === "image" && !e.attachedFilename
  );

  candidates.forEach((candidate, idx) => {
    if (matches.has(idx)) return;

    const mappedPartner = senderMapping.get(candidate.message.sender);
    const candidateTime = candidate.message.timestamp.getTime();

    let bestMatch: { event: MediaEvent; confidence: "high" | "medium"; diff: number } | null = null;

    for (const event of imageEvents) {
      // Check if there's a media file that could correspond
      const eventMappedPartner = senderMapping.get(event.sender);
      const senderMatch = mappedPartner && eventMappedPartner && mappedPartner === eventMappedPartner;
      if (!senderMatch) continue;

      const diffMs = Math.abs(event.timestamp.getTime() - candidateTime);
      const diffMin = diffMs / 60000;

      if (diffMin > 5) continue;

      const confidence: "high" | "medium" = diffMin <= 2 ? "high" : "medium";

      if (!bestMatch || diffMs < bestMatch.diff) {
        bestMatch = { event, confidence, diff: diffMs };
      }
    }

    if (bestMatch) {
      // Find a media file to associate - try to find by timestamp proximity in filenames
      // WhatsApp typically names files like IMG-YYYYMMDD-WAxxxx.jpg
      const availableFiles = Array.from(mediaFiles.keys()).filter(
        (fn) => !usedMedia.has(fn) && /\.(jpg|jpeg|png|webp)$/i.test(fn)
      );
      if (availableFiles.length > 0) {
        const fn = availableFiles[0]; // simplified: take first available
        matches.set(idx, {
          mediaFilename: fn,
          confidence: bestMatch.confidence,
          mediaEvent: bestMatch.event,
        });
        usedMedia.add(fn);
      }
    }
  });

  // Mark unmatched
  candidates.forEach((_, idx) => {
    if (!matches.has(idx)) matches.set(idx, null);
  });

  return matches;
}
