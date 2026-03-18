import type { PlacePrediction } from "@/types/location";

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("Google Maps API key not configured");
  }
  return key;
}

export async function getPlaceAutocomplete(
  input: string
): Promise<PlacePrediction[]> {
  const key = getApiKey();
  const params = new URLSearchParams({
    input,
    types: "(cities)",
    key,
  });

  const response = await fetch(
    `${PLACES_API_BASE}/autocomplete/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places error: ${data.status}`);
  }

  return (data.predictions ?? []).map(
    (p: {
      place_id: string;
      description: string;
      structured_formatting: {
        main_text: string;
        secondary_text: string;
      };
    }) => ({
      place_id: p.place_id,
      description: p.description,
      structured_formatting: p.structured_formatting,
    })
  );
}
