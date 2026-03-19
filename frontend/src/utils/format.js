/**
 * Strip " by ArtistName" suffix from track titles.
 * SoundCloud oEmbed often returns "Track Title by Artist" as the title.
 */
export function stripArtistSuffix(title, artist) {
  const suffix = ` by ${artist}`;
  return title.toLowerCase().endsWith(suffix.toLowerCase())
    ? title.slice(0, -suffix.length)
    : title;
}
