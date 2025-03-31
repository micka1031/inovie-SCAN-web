/// <reference types="@types/google.maps" />

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element | null, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds): void;
      panToBounds(bounds: LatLngBounds): void;
      getBounds(): LatLngBounds;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      getPosition(): LatLng | null;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }

    class Polyline {
      constructor(opts?: PolylineOptions);
      setMap(map: Map | null): void;
      getPath(): MVCArray<LatLng>;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map?: Map, anchor?: Marker): void;
      close(): void;
      setContent(content: string | Element): void;
      setPosition(position: LatLng | LatLngLiteral): void;
    }

    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      isEmpty(): boolean;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
    }

    class MVCArray<T> {
      constructor(array?: T[]);
      getArray(): T[];
      getAt(i: number): T;
      getLength(): number;
      insertAt(i: number, elem: T): void;
      removeAt(i: number): T;
      setAt(i: number, elem: T): void;
      push(elem: T): number;
      forEach(callback: (elem: T, i: number) => void): void;
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      mapTypeId?: MapTypeId;
      disableDefaultUI?: boolean;
      disableDoubleClickZoom?: boolean;
      mapTypeControl?: boolean;
      mapTypeControlOptions?: MapTypeControlOptions;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
      zoomControlOptions?: ZoomControlOptions;
      gestureHandling?: string;
      clickableIcons?: boolean;
      styles?: MapTypeStyle[];
    }

    interface MapTypeControlOptions {
      style?: MapTypeControlStyle;
      position?: ControlPosition;
      mapTypeIds?: (MapTypeId | string)[];
    }

    interface ZoomControlOptions {
      position?: ControlPosition;
    }

    interface MarkerOptions {
      position: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: string | Icon | Symbol;
      label?: string | MarkerLabel;
      draggable?: boolean;
      clickable?: boolean;
      visible?: boolean;
      zIndex?: number;
      opacity?: number;
      animation?: Animation;
    }

    interface MarkerLabel {
      text: string;
      color?: string;
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
    }

    interface PolylineOptions {
      path?: LatLng[] | LatLngLiteral[] | MVCArray<LatLng | LatLngLiteral>;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      map?: Map;
      visible?: boolean;
      zIndex?: number;
      geodesic?: boolean;
      draggable?: boolean;
      clickable?: boolean;
    }

    interface InfoWindowOptions {
      content?: string | Element;
      position?: LatLng | LatLngLiteral;
      maxWidth?: number;
      zIndex?: number;
      disableAutoPan?: boolean;
    }

    interface MapsEventListener {
      remove(): void;
    }

    interface Icon {
      url: string;
      size?: Size;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
    }

    interface Symbol {
      path: SymbolPath | string;
      fillColor?: string;
      fillOpacity?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      labelOrigin?: Point;
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      equals(other: Point): boolean;
      toString(): string;
    }

    class Size {
      constructor(width: number, height: number);
      width: number;
      height: number;
      equals(other: Size): boolean;
      toString(): string;
    }

    interface MapTypeStyle {
      featureType?: string;
      elementType?: string;
      stylers: any[];
    }

    interface MouseEvent extends Event {
      latLng: LatLng;
      stop(): void;
    }

    enum MapTypeId {
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      HYBRID = 'hybrid',
      TERRAIN = 'terrain'
    }

    enum MapTypeControlStyle {
      DEFAULT = 0,
      HORIZONTAL_BAR = 1,
      DROPDOWN_MENU = 2,
      INSET = 3,
      INSET_LARGE = 4
    }

    enum ControlPosition {
      TOP_LEFT = 1,
      TOP_CENTER = 2,
      TOP_RIGHT = 3,
      LEFT_TOP = 4,
      LEFT_CENTER = 5,
      LEFT_BOTTOM = 6,
      RIGHT_TOP = 7,
      RIGHT_CENTER = 8,
      RIGHT_BOTTOM = 9,
      BOTTOM_LEFT = 10,
      BOTTOM_CENTER = 11,
      BOTTOM_RIGHT = 12
    }

    enum Animation {
      BOUNCE = 1,
      DROP = 2
    }

    enum SymbolPath {
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4,
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2
    }

    class DirectionsService {
      route(
        request: DirectionsRequest,
        callback: (result: DirectionsResult, status: DirectionsStatus) => void
      ): void;
    }

    interface DirectionsRequest {
      origin: LatLng | string | LatLngLiteral;
      destination: LatLng | string | LatLngLiteral;
      travelMode: TravelMode;
      drivingOptions?: DrivingOptions;
    }

    interface DrivingOptions {
      departureTime: Date;
      trafficModel: TrafficModel;
    }

    interface DirectionsResult {
      routes: DirectionsRoute[];
    }

    interface DirectionsRoute {
      legs: DirectionsLeg[];
      overview_path?: LatLng[];
      overview_polyline: { points: string };
    }

    interface DirectionsLeg {
      distance: Distance;
      duration: Duration;
      duration_in_traffic?: Duration;
    }

    interface Distance {
      text: string;
      value: number; // mètres
    }

    interface Duration {
      text: string;
      value: number; // secondes
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    enum DirectionsStatus {
      OK = 'OK',
      NOT_FOUND = 'NOT_FOUND',
      ZERO_RESULTS = 'ZERO_RESULTS',
      MAX_WAYPOINTS_EXCEEDED = 'MAX_WAYPOINTS_EXCEEDED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }

    enum TravelMode {
      DRIVING = 'DRIVING',
      BICYCLING = 'BICYCLING',
      TRANSIT = 'TRANSIT',
      WALKING = 'WALKING'
    }

    enum TrafficModel {
      BEST_GUESS = 'bestguess',
      OPTIMISTIC = 'optimistic',
      PESSIMISTIC = 'pessimistic'
    }
  }
}

// Ajouter les types Google Maps à l'objet Window
declare global {
  interface Window {
    google: typeof google;
    initGoogleMapsCallback: () => void;
    geometryLoadedCallback: () => void;
  }
} 