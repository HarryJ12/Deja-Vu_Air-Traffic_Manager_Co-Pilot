// Real-world lookups so clickable artifacts carry recognizable names.

export type Airport = { icao: string; name: string; city: string; lat: number; lon: number };

export const AIRPORTS: Record<string, Airport> = {
  KORD: { icao: "KORD", name: "Chicago O'Hare Intl", city: "Chicago", lat: 41.978, lon: -87.908 },
  KDEN: { icao: "KDEN", name: "Denver Intl", city: "Denver", lat: 39.862, lon: -104.673 },
  KLAX: { icao: "KLAX", name: "Los Angeles Intl", city: "Los Angeles", lat: 33.942, lon: -118.408 },
  KEWR: { icao: "KEWR", name: "Newark Liberty Intl", city: "Newark", lat: 40.692, lon: -74.169 },
  KJFK: { icao: "KJFK", name: "John F. Kennedy Intl", city: "New York", lat: 40.64, lon: -73.779 },
  KBOS: { icao: "KBOS", name: "Boston Logan Intl", city: "Boston", lat: 42.366, lon: -71.02 },
  KSEA: { icao: "KSEA", name: "Seattle-Tacoma Intl", city: "Seattle", lat: 47.45, lon: -122.309 },
  KMSP: { icao: "KMSP", name: "Minneapolis-St. Paul Intl", city: "Minneapolis", lat: 44.882, lon: -93.222 },
  KATL: { icao: "KATL", name: "Hartsfield-Jackson Atlanta Intl", city: "Atlanta", lat: 33.64, lon: -84.427 },
  KSFO: { icao: "KSFO", name: "San Francisco Intl", city: "San Francisco", lat: 37.619, lon: -122.375 },
  KDFW: { icao: "KDFW", name: "Dallas-Fort Worth Intl", city: "Dallas", lat: 32.897, lon: -97.038 },
  KIAH: { icao: "KIAH", name: "Houston George Bush Intl", city: "Houston", lat: 29.984, lon: -95.341 },
  KMIA: { icao: "KMIA", name: "Miami Intl", city: "Miami", lat: 25.795, lon: -80.29 },
  KLAS: { icao: "KLAS", name: "Harry Reid Intl", city: "Las Vegas", lat: 36.084, lon: -115.154 },
  KPHX: { icao: "KPHX", name: "Phoenix Sky Harbor Intl", city: "Phoenix", lat: 33.434, lon: -112.012 },
  KSLC: { icao: "KSLC", name: "Salt Lake City Intl", city: "Salt Lake City", lat: 40.788, lon: -111.978 },
  KMCI: { icao: "KMCI", name: "Kansas City Intl", city: "Kansas City", lat: 39.298, lon: -94.714 },
};

const AIRLINES: Record<string, string> = {
  UAL: "United",
  AAL: "American",
  DAL: "Delta",
  SWA: "Southwest",
  JBU: "JetBlue",
  FFT: "Frontier",
  SKW: "SkyWest",
  NKS: "Spirit",
  ASA: "Alaska",
};

export function airportName(icao: string): string {
  return AIRPORTS[icao]?.name ?? icao;
}

export function airportCity(icao: string): string {
  return AIRPORTS[icao]?.city ?? icao;
}

// "UAL2367" -> "United 2367"
export function flightDisplayName(flightNumber: string): string {
  const m = flightNumber.match(/^([A-Z]{2,3})(\d+)$/);
  if (!m) return flightNumber;
  const airline = AIRLINES[m[1]];
  return airline ? `${airline} ${m[2]}` : flightNumber;
}
