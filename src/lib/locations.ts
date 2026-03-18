/**
 * Maps common country names/abbreviations from Google Places
 * to DataForSEO location_name values.
 *
 * DataForSEO Labs only supports country-level locations.
 * Google Places returns descriptions like "Los Angeles, CA, USA"
 * so we extract the last segment and map it.
 */

const COUNTRY_MAP: Record<string, string> = {
  // Common abbreviations
  usa: "United States",
  us: "United States",
  uk: "United Kingdom",
  uae: "United Arab Emirates",

  // Full names (lowercase) → DataForSEO names
  "united states": "United States",
  "united kingdom": "United Kingdom",
  australia: "Australia",
  canada: "Canada",
  india: "India",
  germany: "Germany",
  france: "France",
  brazil: "Brazil",
  mexico: "Mexico",
  japan: "Japan",
  italy: "Italy",
  spain: "Spain",
  netherlands: "Netherlands",
  sweden: "Sweden",
  norway: "Norway",
  denmark: "Denmark",
  finland: "Finland",
  switzerland: "Switzerland",
  austria: "Austria",
  belgium: "Belgium",
  portugal: "Portugal",
  ireland: "Ireland",
  "new zealand": "New Zealand",
  singapore: "Singapore",
  "south africa": "South Africa",
  nigeria: "Nigeria",
  philippines: "Philippines",
  indonesia: "Indonesia",
  malaysia: "Malaysia",
  thailand: "Thailand",
  vietnam: "Vietnam",
  "south korea": "South Korea",
  taiwan: "Taiwan",
  colombia: "Colombia",
  argentina: "Argentina",
  chile: "Chile",
  peru: "Peru",
  poland: "Poland",
  turkey: "Turkey",
  "saudi arabia": "Saudi Arabia",
  egypt: "Egypt",
  israel: "Israel",
  pakistan: "Pakistan",
  bangladesh: "Bangladesh",
  romania: "Romania",
  czechia: "Czechia",
  "czech republic": "Czechia",
  hungary: "Hungary",
  greece: "Greece",
  ukraine: "Ukraine",
  kenya: "Kenya",
  ghana: "Ghana",
  "hong kong": "Hong Kong",
  china: "China",
  russia: "Russia",
};

/**
 * Extract the DataForSEO location_name from a Google Places description.
 * e.g. "Los Angeles, CA, USA" → "United States"
 *      "London, UK" → "United Kingdom"
 *      "United States" → "United States"
 */
export function extractCountryForDataForSEO(locationDescription: string): string {
  // If the input itself is a known country, return it directly
  const directMatch = COUNTRY_MAP[locationDescription.toLowerCase().trim()];
  if (directMatch) return directMatch;

  // Try the last segment after the last comma
  const parts = locationDescription.split(",").map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const match = COUNTRY_MAP[parts[i].toLowerCase()];
    if (match) return match;
  }

  // Fallback: return the full string and let DataForSEO handle it
  return locationDescription;
}
