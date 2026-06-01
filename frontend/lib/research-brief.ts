export interface ParsedSource {
  url: string;
  publisher: string;
  title: string;
  /** Claim or excerpt from the brief that cites this source */
  description: string;
}

export interface ParsedResearchBrief {
  body: string;
  sources: ParsedSource[];
  title: string | null;
}

const SECTION_HEADERS = [
  "Summary",
  "Key Findings",
  "Contradictions & Debates",
  "Confidence Assessment",
  "Sources",
] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function buildInlineSourceLabel(claim: string, url: string): string {
  const host = getHostname(url);
  const cleaned = claim.replace(/^[-*•]\s*/, "").trim();
  const topic = cleaned.split(":")[0]?.trim() ?? cleaned;
  const shortTopic =
    topic.length > 48 ? `${topic.slice(0, 45).trim()}…` : topic;

  return shortTopic ? `${shortTopic} · ${host}` : host;
}

function linkifyInlineSources(line: string): string {
  if (!/\[Source:\s*https?:\/\//i.test(line)) {
    return line;
  }

  return line.replace(
    /^(.+?)\s*\[Source:\s*(https?:\/\/[^\]\s]+)\]/i,
    (_match, claim, url) => {
      const label = buildInlineSourceLabel(claim, url);
      return `${claim.trim()} [${label}](${url})`;
    },
  );
}

function parseSourceLine(line: string): ParsedSource | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const quotedTitleMatch = trimmed.match(
    /^(https?:\/\/\S+)\s*[—-]\s*(.+?)\s*[—-]\s*["“]([^"”]+)["”]\s*$/,
  );
  if (quotedTitleMatch) {
    return {
      url: quotedTitleMatch[1].replace(/[.,;]+$/, ""),
      publisher: quotedTitleMatch[2].trim(),
      title: quotedTitleMatch[3].trim(),
      description: "",
    };
  }

  const urlMatch = trimmed.match(/^(https?:\/\/\S+)/);
  if (!urlMatch) return null;

  const url = urlMatch[1].replace(/[.,;]+$/, "");
  const remainder = trimmed.slice(urlMatch[0].length).trim();

  if (!remainder.startsWith("—") && !remainder.startsWith("-")) {
    return { url, publisher: "", title: "", description: "" };
  }

  const parts = remainder
    .replace(/^[—-]\s*/, "")
    .split(/\s*[—-]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  const publisher = parts[0] ?? "";
  const titlePart = parts.slice(1).join(" — ");
  const title = titlePart.replace(/^["“]|["”]$/g, "").trim();

  return { url, publisher, title, description: "" };
}

function normalizeUrlForMatch(url: string): string {
  return url.replace(/[.,;]+$/, "").replace(/\/$/, "");
}

function findClaimForUrl(body: string, url: string): string {
  const target = normalizeUrlForMatch(url);
  const lines = body.split("\n");

  for (const line of lines) {
    const normalizedLine = normalizeUrlForMatch(line);
    if (
      !normalizedLine.includes(target) &&
      !line.includes(url)
    ) {
      continue;
    }

    let text = line
      .replace(/\[Source:\s*https?:\/\/[^\]\s]+\]/gi, "")
      .replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, "")
      .replace(/^[-*•]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

    const labelPrefix = text.match(/^([^:\n]{1,80}):\s+/);
    if (labelPrefix) {
      text = text.slice(labelPrefix[0].length).trim();
    }

    if (text.length >= 24) {
      return text;
    }
  }

  return "";
}

function enrichSourcesWithContext(
  body: string,
  sources: ParsedSource[],
): ParsedSource[] {
  return sources.map((source) => ({
    ...source,
    description: findClaimForUrl(body, source.url),
  }));
}

function extractSourcesSection(content: string): {
  body: string;
  sources: ParsedSource[];
} {
  const sourcesHeader = content.match(/\n## Sources\s*\n/i);
  if (!sourcesHeader || sourcesHeader.index === undefined) {
    return { body: content, sources: [] };
  }

  const body = content.slice(0, sourcesHeader.index).trim();
  const sourcesBlock = content
    .slice(sourcesHeader.index)
    .replace(/^[\s\S]*?## Sources\s*\n/i, "")
    .trim();

  const sources = sourcesBlock
    .split("\n")
    .map(parseSourceLine)
    .filter((source): source is ParsedSource => source !== null);

  return { body, sources };
}

export function normalizeResearchBrief(content: string): string {
  let text = content.replace(/\r\n/g, "\n").trim();

  text = text.replace(/^Research Brief:\s*(.+)$/m, "# Research Brief: $1");
  text = text.replace(/^•\s+/gm, "- ");
  text = text
    .split("\n")
    .map((line) => linkifyInlineSources(line))
    .join("\n");

  for (const header of SECTION_HEADERS) {
    text = text.replace(
      new RegExp(`^${escapeRegex(header)}$`, "gm"),
      `## ${header}`,
    );
  }

  return text;
}

export function parseResearchBrief(content: string): ParsedResearchBrief {
  const normalized = normalizeResearchBrief(content);
  const titleMatch = normalized.match(/^#\s+(Research Brief:.+)$/m);
  const title = titleMatch?.[1] ?? null;
  const { body, sources } = extractSourcesSection(normalized);

  return {
    body,
    sources: enrichSourcesWithContext(body, sources),
    title,
  };
}

export function collectInlineSourceUrls(content: string): string[] {
  const urls = new Set<string>();
  const patterns = [
    /\[Source:\s*(https?:\/\/[^\]\s]+)\]/gi,
    /\[Source\]\((https?:\/\/[^)]+)\)/gi,
    /\[source\]\((https?:\/\/[^)]+)\)/gi,
    /(https?:\/\/[^\s)\]>]+)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const url = match[1]?.replace(/[.,;]+$/, "");
      if (url) urls.add(url);
    }
  }

  return [...urls];
}
