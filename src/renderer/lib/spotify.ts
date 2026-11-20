const KINDS = '(track|album|playlist|artist|episode|show)';

export function toSpotifyEmbed(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const embed = value.match(new RegExp(`open\\.spotify\\.com/embed/${KINDS}/([A-Za-z0-9]+)`));
  if (embed) return `https://open.spotify.com/embed/${embed[1]}/${embed[2]}`;

  const uri = value.match(new RegExp(`spotify:${KINDS}:([A-Za-z0-9]+)`));
  if (uri) return `https://open.spotify.com/embed/${uri[1]}/${uri[2]}`;

  const link = value.match(new RegExp(`open\\.spotify\\.com/(?:intl-[a-z]+/)?${KINDS}/([A-Za-z0-9]+)`));
  if (link) return `https://open.spotify.com/embed/${link[1]}/${link[2]}`;

  return null;
}

export function embedKind(url: string): string {
  const match = url.match(new RegExp(`/embed/(${KINDS})/`));
  return match ? match[1] : 'track';
}

export function embedHeight(kind: string): number {
  return kind === 'track' || kind === 'episode' ? 152 : 352;
}
