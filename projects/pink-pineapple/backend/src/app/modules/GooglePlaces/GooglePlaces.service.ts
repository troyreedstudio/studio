import config from "../../../config";

const GOOGLE_API_KEY = config.google_places_api_key;
const BALI_CENTER = { lat: -8.4095, lng: 115.1889 };
const BALI_RADIUS = 50000; // 50km covers all of Bali

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  category: string;
  rating: number;
  userRatingCount: number;
  photoUrl: string;
  latitude: number;
  longitude: number;
  source: "google";
}

/**
 * Search Google Places (New) Text Search API for venues in Bali.
 * Returns a simplified format matching our venue model shape.
 */
const searchPlaces = async (
  query: string,
  type?: string
): Promise<PlaceResult[]> => {
  if (!GOOGLE_API_KEY) {
    return [];
  }

  const textQuery = `${query} in Bali, Indonesia`;

  const body: Record<string, any> = {
    textQuery,
    locationBias: {
      circle: {
        center: { latitude: BALI_CENTER.lat, longitude: BALI_CENTER.lng },
        radius: BALI_RADIUS,
      },
    },
    maxResultCount: 10,
    languageCode: "en",
  };

  // Map our categories to Google Place types
  if (type) {
    const typeMap: Record<string, string> = {
      RESTAURANT: "restaurant",
      NIGHTLIFE: "night_club",
      BEACH_CLUB: "restaurant",
      WELLNESS: "gym",
      BAR: "bar",
    };
    const googleType = typeMap[type.toUpperCase()];
    if (googleType) {
      body.includedType = googleType;
    }
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryType,places.location,places.photos",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      console.error(
        `Google Places API error: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    const places = data.places || [];

    return places.map((place: any) => {
      // Build a photo URL if available
      let photoUrl = "";
      if (place.photos?.length > 0) {
        const photoName = place.photos[0].name;
        photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=600&key=${GOOGLE_API_KEY}`;
      }

      // Map Google's primaryType to our category format
      const categoryMap: Record<string, string> = {
        restaurant: "RESTAURANT",
        night_club: "NIGHTLIFE",
        bar: "BAR",
        gym: "WELLNESS",
        spa: "WELLNESS",
        cafe: "RESTAURANT",
        bakery: "RESTAURANT",
      };

      return {
        id: `google_${place.id}`,
        name: place.displayName?.text || "",
        address: place.formattedAddress || "",
        category: categoryMap[place.primaryType] || "OTHER",
        rating: place.rating || 0,
        userRatingCount: place.userRatingCount || 0,
        photoUrl,
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
        source: "google" as const,
      };
    });
  } catch (error) {
    console.error("Google Places search failed:", error);
    return [];
  }
};

/**
 * Check if Google Places is configured.
 */
const isConfigured = (): boolean => {
  return !!GOOGLE_API_KEY;
};

export const googlePlacesService = {
  searchPlaces,
  isConfigured,
};
