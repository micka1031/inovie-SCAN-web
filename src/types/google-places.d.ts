/**
 * Déclarations de types pour l'API Google Places
 */

declare namespace google.maps.places {
  interface PlacesService {
    findPlaceFromQuery(
      request: FindPlaceFromQueryRequest,
      callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
    ): void;
    getDetails(
      request: PlaceDetailsRequest,
      callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void
    ): void;
    nearbySearch(
      request: NearbySearchRequest,
      callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
    ): void;
  }

  interface NearbySearchRequest {
    location: google.maps.LatLng;
    radius: number;
    type?: string[];
    rankBy?: RankBy;
    keyword?: string;
  }

  enum RankBy {
    PROMINENCE = 0,
    DISTANCE = 1
  }

  interface FindPlaceFromQueryRequest {
    query: string;
    fields: string[];
    locationBias?: LocationBias;
  }

  interface PlaceDetailsRequest {
    placeId: string;
    fields?: string[];
  }

  enum PlacesServiceStatus {
    OK = 'OK',
    ZERO_RESULTS = 'ZERO_RESULTS',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    NOT_FOUND = 'NOT_FOUND'
  }

  type LocationBias = LatLngBounds | LatLng | Circle | string;

  interface PlaceResult {
    place_id: string;
    name?: string;
    formatted_address?: string;
    opening_hours?: OpeningHours;
    geometry?: {
      location: google.maps.LatLng;
    };
    rating?: number;
    types?: string[];
    vicinity?: string;
  }

  interface OpeningHours {
    isOpen(date?: Date): boolean;
    periods: OpeningPeriod[];
    weekday_text: string[];
  }

  interface OpeningPeriod {
    open: OpeningHoursTime;
    close?: OpeningHoursTime;
  }

  interface OpeningHoursTime {
    day: number;
    hour: number;
    minute: number;
    time: string;
  }
} 