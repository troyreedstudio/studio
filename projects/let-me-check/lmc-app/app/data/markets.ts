// Centralized data: countries, markets (cities), and venues for LMC.
// Adding a country = add a Country row. Adding a city = add a Market row.
// Adding a venue = add a Venue row with matching marketId. No other code changes needed.

export type MarketStatus = 'live' | 'soon' | 'waitlist';

export type Country = {
  code: string; // ISO 3166-1 alpha-2 e.g. 'US'
  name: string;
  flag: string; // emoji
  dial: string; // international dialing prefix e.g. '+1'
  status: MarketStatus;
  featured: boolean;
};

export type Market = {
  id: string;
  name: string;
  region: string; // state, province, or region
  countryCode: string;
  status: MarketStatus;
  scouts: number;
  center: [number, number]; // [lon, lat]
  neighborhoods: string[];
  featured: boolean; // surfaces at top of city list
};

export type FilmingPolicy = 'green' | 'yellow' | 'red';

export type Venue = {
  name: string;
  address: string;
  category: string;
  coord: [number, number];
  marketId: string;
  /**
   * Per-venue override of the category default filming policy.
   * If unset, getVenueFilmingPolicy() falls back to CATEGORY_FILMING_DEFAULTS.
   * See docs/FILMING-POLICY.md for the full tier system.
   */
  filmingPolicy?: FilmingPolicy;
  /**
   * True when this venue has signed an LMC Partner agreement.
   * Partners grant explicit interior filming permission and get a PARTNER badge
   * in search results + on the pin card. Seekers can add "+$5 interior" at checkout.
   */
  partner?: boolean;
};

/**
 * Category defaults for filming permission.
 * Per-venue overrides (Venue.filmingPolicy) take precedence.
 * See docs/FILMING-POLICY.md section 2 for the rationale per category.
 */
export const CATEGORY_FILMING_DEFAULTS: Record<string, FilmingPolicy> = {
  Nightclub: 'yellow',
  Restaurant: 'green',
  'Beach Club': 'green',
  'Members Club': 'yellow',
  Hotel: 'green',
  Gym: 'yellow',
  Airport: 'yellow',
  DMV: 'green',
  Government: 'yellow',
  Retail: 'green',
  Events: 'green',
  // Categories that are categorically forbidden in v1:
  Hospital: 'red',
  School: 'red',
  Court: 'red',
  Police: 'red',
};

export const DEFAULT_COUNTRY_CODE = 'US';
export const DEFAULT_MARKET_ID = 'mia';

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1', status: 'live', featured: true },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44', status: 'soon', featured: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1', status: 'soon', featured: true },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971', status: 'soon', featured: false },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dial: '+65', status: 'waitlist', featured: false },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dial: '+62', status: 'waitlist', featured: false },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61', status: 'waitlist', featured: false },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '+52', status: 'waitlist', featured: false },
];

/**
 * Dial code list for the phone-OTP picker on sign-up.
 * Top 50 entertainment / business / tourism markets — much broader than LMC's
 * launched market list. Anyone from these countries can sign up; whether LMC
 * actually serves their city is a separate question (see COUNTRIES).
 */
export type DialCode = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  dial: string;
};

export const COUNTRY_DIAL_CODES: DialCode[] = [
  // North America
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '+52' },
  // Central / South America
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '+55' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '+54' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial: '+57' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dial: '+56' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', dial: '+51' },
  // Western Europe
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dial: '+353' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '+31' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '+32' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dial: '+41' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', dial: '+43' },
  // Nordics
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '+46' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dial: '+47' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', dial: '+45' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', dial: '+358' },
  // Central / Eastern Europe
  { code: 'PL', name: 'Poland', flag: '🇵🇱', dial: '+48' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dial: '+420' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', dial: '+30' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', dial: '+7' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dial: '+90' },
  // Middle East
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial: '+966' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dial: '+974' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', dial: '+972' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dial: '+20' },
  // Africa
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '+27' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254' },
  // South / East Asia
  { code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91' },
  { code: 'CN', name: 'China', flag: '🇨🇳', dial: '+86' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dial: '+852' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dial: '+886' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dial: '+81' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', dial: '+82' },
  // Southeast Asia
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dial: '+65' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dial: '+60' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dial: '+62' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial: '+63' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', dial: '+66' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dial: '+84' },
  // Oceania
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial: '+64' },
];

export const MARKETS: Market[] = [
  // ============ USA — LIVE (launch wedge) ============
  { id: 'mia', name: 'Miami', region: 'Florida', countryCode: 'US', status: 'live', scouts: 142, center: [-80.1918, 25.7617], neighborhoods: ['Brickell', 'Wynwood', 'South Beach', 'Downtown', 'Mid Beach', 'Coconut Grove', 'Coral Gables', 'Bal Harbour'], featured: true },
  { id: 'nyc', name: 'New York', region: 'New York', countryCode: 'US', status: 'live', scouts: 311, center: [-74.006, 40.7128], neighborhoods: ['SoHo', 'Tribeca', 'Chelsea', 'Greenwich Village', 'Meatpacking', 'Upper East Side', 'Brooklyn', 'Queens', 'Bronx', 'Williamsburg'], featured: true },

  // ============ USA — LAUNCHING SOON (top metros) ============
  { id: 'lax', name: 'Los Angeles', region: 'California', countryCode: 'US', status: 'soon', scouts: 0, center: [-118.2437, 34.0522], neighborhoods: ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'Malibu', 'West Hollywood', 'Downtown LA', 'Silver Lake'], featured: true },
  { id: 'chi', name: 'Chicago', region: 'Illinois', countryCode: 'US', status: 'soon', scouts: 0, center: [-87.6298, 41.8781], neighborhoods: ['River North', 'Loop', 'West Loop', 'Lincoln Park', 'Wicker Park'], featured: true },
  { id: 'lv', name: 'Las Vegas', region: 'Nevada', countryCode: 'US', status: 'soon', scouts: 0, center: [-115.1398, 36.1699], neighborhoods: ['The Strip', 'Downtown', 'Summerlin', 'Henderson'], featured: true },
  { id: 'sf', name: 'San Francisco', region: 'California', countryCode: 'US', status: 'soon', scouts: 0, center: [-122.4194, 37.7749], neighborhoods: ['Mission', 'SoMa', 'Marina', 'Castro', 'Nob Hill'], featured: true },
  { id: 'hou', name: 'Houston', region: 'Texas', countryCode: 'US', status: 'soon', scouts: 0, center: [-95.3698, 29.7604], neighborhoods: ['Downtown', 'Midtown', 'River Oaks', 'The Heights', 'Galleria'], featured: false },
  { id: 'dal', name: 'Dallas', region: 'Texas', countryCode: 'US', status: 'soon', scouts: 0, center: [-96.7970, 32.7767], neighborhoods: ['Uptown', 'Deep Ellum', 'Bishop Arts', 'Downtown'], featured: false },
  { id: 'atl', name: 'Atlanta', region: 'Georgia', countryCode: 'US', status: 'soon', scouts: 0, center: [-84.388, 33.749], neighborhoods: ['Buckhead', 'Midtown', 'Old Fourth Ward', 'West Midtown'], featured: true },
  { id: 'dc', name: 'Washington', region: 'District of Columbia', countryCode: 'US', status: 'soon', scouts: 0, center: [-77.0369, 38.9072], neighborhoods: ['Georgetown', 'Dupont Circle', 'Capitol Hill', 'Adams Morgan'], featured: false },
  { id: 'sea', name: 'Seattle', region: 'Washington', countryCode: 'US', status: 'soon', scouts: 0, center: [-122.3321, 47.6062], neighborhoods: ['Capitol Hill', 'Belltown', 'Ballard', 'Fremont'], featured: false },
  { id: 'bos', name: 'Boston', region: 'Massachusetts', countryCode: 'US', status: 'soon', scouts: 0, center: [-71.0589, 42.3601], neighborhoods: ['Back Bay', 'North End', 'South End', 'Seaport'], featured: false },
  { id: 'phi', name: 'Philadelphia', region: 'Pennsylvania', countryCode: 'US', status: 'soon', scouts: 0, center: [-75.1652, 39.9526], neighborhoods: ['Center City', 'Old City', 'Fishtown', 'Rittenhouse'], featured: false },
  { id: 'phx', name: 'Phoenix', region: 'Arizona', countryCode: 'US', status: 'soon', scouts: 0, center: [-112.0740, 33.4484], neighborhoods: ['Downtown', 'Scottsdale', 'Tempe', 'Camelback'], featured: false },
  { id: 'aus', name: 'Austin', region: 'Texas', countryCode: 'US', status: 'soon', scouts: 0, center: [-97.7431, 30.2672], neighborhoods: ['Downtown', 'South Congress', 'East Austin', 'The Domain'], featured: true },
  { id: 'den', name: 'Denver', region: 'Colorado', countryCode: 'US', status: 'soon', scouts: 0, center: [-104.9903, 39.7392], neighborhoods: ['LoDo', 'RiNo', 'Cherry Creek', 'Highland'], featured: false },
  { id: 'orl', name: 'Orlando', region: 'Florida', countryCode: 'US', status: 'soon', scouts: 0, center: [-81.3792, 28.5383], neighborhoods: ['Downtown', 'Winter Park', 'Lake Nona', 'International Drive'], featured: false },
  { id: 'sd', name: 'San Diego', region: 'California', countryCode: 'US', status: 'soon', scouts: 0, center: [-117.1611, 32.7157], neighborhoods: ['Gaslamp', 'La Jolla', 'Pacific Beach', 'North Park'], featured: false },
  { id: 'nas', name: 'Nashville', region: 'Tennessee', countryCode: 'US', status: 'soon', scouts: 0, center: [-86.7816, 36.1627], neighborhoods: ['Downtown', 'East Nashville', 'The Gulch', '12 South'], featured: true },

  // ============ USA — WAITLIST (rest of top metros + state capitals) ============
  { id: 'sj', name: 'San Jose', region: 'California', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-121.8863, 37.3382], neighborhoods: ['Downtown', 'Willow Glen', 'Japantown'], featured: false },
  { id: 'jax', name: 'Jacksonville', region: 'Florida', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-81.6557, 30.3322], neighborhoods: ['Downtown', 'Riverside', 'San Marco'], featured: false },
  { id: 'fw', name: 'Fort Worth', region: 'Texas', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-97.3208, 32.7555], neighborhoods: ['Downtown', 'Stockyards', 'Cultural District'], featured: false },
  { id: 'col', name: 'Columbus', region: 'Ohio', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-82.9988, 39.9612], neighborhoods: ['Short North', 'German Village', 'Arena District'], featured: false },
  { id: 'cha', name: 'Charlotte', region: 'North Carolina', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-80.8431, 35.2271], neighborhoods: ['Uptown', 'NoDa', 'South End'], featured: false },
  { id: 'ind', name: 'Indianapolis', region: 'Indiana', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-86.1581, 39.7684], neighborhoods: ['Mass Ave', 'Broad Ripple', 'Fountain Square'], featured: false },
  { id: 'sa', name: 'San Antonio', region: 'Texas', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-98.4936, 29.4241], neighborhoods: ['Downtown', 'Pearl District', 'Southtown'], featured: false },
  { id: 'por', name: 'Portland', region: 'Oregon', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-122.6765, 45.5152], neighborhoods: ['Pearl District', 'Alberta', 'Hawthorne'], featured: false },
  { id: 'mem', name: 'Memphis', region: 'Tennessee', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-90.049, 35.1495], neighborhoods: ['Downtown', 'Midtown', 'Cooper Young'], featured: false },
  { id: 'okc', name: 'Oklahoma City', region: 'Oklahoma', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-97.5164, 35.4676], neighborhoods: ['Bricktown', 'Plaza District', 'Midtown'], featured: false },
  { id: 'lou', name: 'Louisville', region: 'Kentucky', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-85.7585, 38.2527], neighborhoods: ['Downtown', 'NuLu', 'Highlands'], featured: false },
  { id: 'bal', name: 'Baltimore', region: 'Maryland', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-76.6122, 39.2904], neighborhoods: ['Inner Harbor', 'Federal Hill', 'Fells Point'], featured: false },
  { id: 'mil', name: 'Milwaukee', region: 'Wisconsin', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-87.9065, 43.0389], neighborhoods: ['Third Ward', 'East Side', 'Walker\'s Point'], featured: false },
  { id: 'abq', name: 'Albuquerque', region: 'New Mexico', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-106.6504, 35.0844], neighborhoods: ['Old Town', 'Nob Hill', 'Downtown'], featured: false },
  { id: 'tuc', name: 'Tucson', region: 'Arizona', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-110.9747, 32.2226], neighborhoods: ['Downtown', '4th Avenue', 'Foothills'], featured: false },
  { id: 'sac', name: 'Sacramento', region: 'California', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-121.4944, 38.5816], neighborhoods: ['Midtown', 'East Sac', 'Land Park'], featured: false },
  { id: 'kc', name: 'Kansas City', region: 'Missouri', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-94.5786, 39.0997], neighborhoods: ['Power & Light', 'Crossroads', 'Westport'], featured: false },
  { id: 'cle', name: 'Cleveland', region: 'Ohio', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-81.6944, 41.4993], neighborhoods: ['Downtown', 'Ohio City', 'Tremont'], featured: false },
  { id: 'det', name: 'Detroit', region: 'Michigan', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-83.0458, 42.3314], neighborhoods: ['Downtown', 'Midtown', 'Corktown'], featured: false },
  { id: 'min', name: 'Minneapolis', region: 'Minnesota', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-93.265, 44.9778], neighborhoods: ['North Loop', 'Uptown', 'Northeast'], featured: false },
  { id: 'tam', name: 'Tampa', region: 'Florida', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-82.4572, 27.9506], neighborhoods: ['Downtown', 'Ybor City', 'Hyde Park'], featured: false },
  { id: 'hon', name: 'Honolulu', region: 'Hawaii', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-157.8583, 21.3069], neighborhoods: ['Waikiki', 'Kakaako', 'Diamond Head'], featured: false },
  { id: 'pit', name: 'Pittsburgh', region: 'Pennsylvania', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-79.9959, 40.4406], neighborhoods: ['Strip District', 'Lawrenceville', 'Shadyside'], featured: false },
  { id: 'cin', name: 'Cincinnati', region: 'Ohio', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-84.5120, 39.1031], neighborhoods: ['Over-the-Rhine', 'Mount Adams', 'Hyde Park'], featured: false },
  { id: 'no', name: 'New Orleans', region: 'Louisiana', countryCode: 'US', status: 'soon', scouts: 0, center: [-90.0715, 29.9511], neighborhoods: ['French Quarter', 'Marigny', 'Garden District'], featured: true },
  { id: 'stl', name: 'St. Louis', region: 'Missouri', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-90.1994, 38.6270], neighborhoods: ['Downtown', 'Central West End', 'The Hill'], featured: false },
  { id: 'slc', name: 'Salt Lake City', region: 'Utah', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-111.891, 40.7608], neighborhoods: ['Downtown', 'Sugar House', '9th & 9th'], featured: false },
  { id: 'ral', name: 'Raleigh', region: 'North Carolina', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-78.6382, 35.7796], neighborhoods: ['Downtown', 'North Hills', 'Glenwood South'], featured: false },
  { id: 'rich', name: 'Richmond', region: 'Virginia', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-77.4360, 37.5407], neighborhoods: ['Fan District', 'Shockoe Bottom', 'Carytown'], featured: false },
  { id: 'vb', name: 'Virginia Beach', region: 'Virginia', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-75.978, 36.8529], neighborhoods: ['Oceanfront', 'Town Center', 'Sandbridge'], featured: false },
  { id: 'birm', name: 'Birmingham', region: 'Alabama', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-86.8025, 33.5186], neighborhoods: ['Downtown', 'Lakeview', 'Five Points South'], featured: false },
  { id: 'boi', name: 'Boise', region: 'Idaho', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-116.2023, 43.6150], neighborhoods: ['Downtown', 'North End', 'Hyde Park'], featured: false },
  { id: 'spo', name: 'Spokane', region: 'Washington', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-117.4260, 47.6588], neighborhoods: ['Downtown', 'South Hill', 'Browne\'s Addition'], featured: false },
  { id: 'dm', name: 'Des Moines', region: 'Iowa', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-93.6091, 41.5868], neighborhoods: ['Downtown', 'East Village', 'Beaverdale'], featured: false },
  { id: 'roc', name: 'Rochester', region: 'New York', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-77.6088, 43.1566], neighborhoods: ['Downtown', 'Park Avenue', 'Corn Hill'], featured: false },
  { id: 'buf', name: 'Buffalo', region: 'New York', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-78.8784, 42.8864], neighborhoods: ['Elmwood Village', 'Allentown', 'Larkin Square'], featured: false },
  { id: 'reno', name: 'Reno', region: 'Nevada', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-119.8138, 39.5296], neighborhoods: ['Midtown', 'Downtown', 'South Reno'], featured: false },
  { id: 'anc', name: 'Anchorage', region: 'Alaska', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-149.9003, 61.2181], neighborhoods: ['Downtown', 'Midtown', 'Hillside'], featured: false },
  { id: 'tal', name: 'Tallahassee', region: 'Florida', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-84.2807, 30.4383], neighborhoods: ['Downtown', 'Midtown', 'College Town'], featured: false },
  { id: 'mad', name: 'Madison', region: 'Wisconsin', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-89.4012, 43.0731], neighborhoods: ['Downtown', 'Capitol Square', 'East Side'], featured: false },
  { id: 'lin', name: 'Lincoln', region: 'Nebraska', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-96.6776, 40.8136], neighborhoods: ['Haymarket', 'Downtown', 'University Place'], featured: false },
  { id: 'wic', name: 'Wichita', region: 'Kansas', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-97.3301, 37.6872], neighborhoods: ['Old Town', 'Delano', 'Riverside'], featured: false },
  { id: 'ftl', name: 'Fort Lauderdale', region: 'Florida', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-80.1373, 26.1224], neighborhoods: ['Las Olas', 'Wilton Manors', 'Victoria Park'], featured: false },
  { id: 'ham', name: 'Hampton', region: 'Virginia', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-76.3452, 37.0299], neighborhoods: ['Downtown', 'Buckroe', 'Phoebus'], featured: false },
  { id: 'sal', name: 'Salem', region: 'Oregon', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-123.0351, 44.9429], neighborhoods: ['Downtown', 'Bush Park', 'West Salem'], featured: false },
  { id: 'aug', name: 'Augusta', region: 'Georgia', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-81.9748, 33.4735], neighborhoods: ['Downtown', 'Summerville', 'Hill Section'], featured: false },
  { id: 'lit', name: 'Little Rock', region: 'Arkansas', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-92.2896, 34.7465], neighborhoods: ['River Market', 'SoMa', 'Hillcrest'], featured: false },
  { id: 'jck', name: 'Jackson', region: 'Mississippi', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-90.1848, 32.2988], neighborhoods: ['Downtown', 'Fondren', 'Belhaven'], featured: false },
  { id: 'mon', name: 'Montgomery', region: 'Alabama', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-86.2999, 32.3668], neighborhoods: ['Downtown', 'Cloverdale', 'Cottage Hill'], featured: false },
  { id: 'col-sc', name: 'Columbia', region: 'South Carolina', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-81.0348, 34.0007], neighborhoods: ['The Vista', 'Five Points', 'Shandon'], featured: false },
  { id: 'che', name: 'Cheyenne', region: 'Wyoming', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-104.8214, 41.1400], neighborhoods: ['Downtown', 'West Edge', 'East Side'], featured: false },
  { id: 'hel', name: 'Helena', region: 'Montana', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-112.0391, 46.5891], neighborhoods: ['Downtown', 'Last Chance Gulch', 'West Side'], featured: false },
  { id: 'bis', name: 'Bismarck', region: 'North Dakota', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-100.7837, 46.8083], neighborhoods: ['Downtown', 'North Bismarck', 'South Bismarck'], featured: false },
  { id: 'pie', name: 'Pierre', region: 'South Dakota', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-100.3460, 44.3683], neighborhoods: ['Downtown', 'Capitol Hill', 'Riverside'], featured: false },
  { id: 'top', name: 'Topeka', region: 'Kansas', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-95.6890, 39.0473], neighborhoods: ['Downtown', 'NOTO', 'College Hill'], featured: false },
  { id: 'spr', name: 'Springfield', region: 'Illinois', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-89.6501, 39.7817], neighborhoods: ['Downtown', 'Historic District', 'Vinegar Hill'], featured: false },
  { id: 'lan', name: 'Lansing', region: 'Michigan', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-84.5555, 42.7325], neighborhoods: ['Downtown', 'Old Town', 'REO Town'], featured: false },
  { id: 'fra', name: 'Frankfort', region: 'Kentucky', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-84.873, 38.2009], neighborhoods: ['Downtown', 'South Frankfort', 'East Frankfort'], featured: false },
  { id: 'tre', name: 'Trenton', region: 'New Jersey', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-74.7429, 40.2206], neighborhoods: ['Downtown', 'Mill Hill', 'Chambersburg'], featured: false },
  { id: 'alb', name: 'Albany', region: 'New York', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-73.7562, 42.6526], neighborhoods: ['Center Square', 'Pine Hills', 'Downtown'], featured: false },
  { id: 'har', name: 'Harrisburg', region: 'Pennsylvania', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-76.8867, 40.2732], neighborhoods: ['Downtown', 'Midtown', 'Shipoke'], featured: false },
  { id: 'cha-wv', name: 'Charleston', region: 'West Virginia', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-81.6326, 38.3498], neighborhoods: ['Downtown', 'East End', 'South Hills'], featured: false },
  { id: 'mont', name: 'Montpelier', region: 'Vermont', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-72.5763, 44.2601], neighborhoods: ['Downtown', 'Hubbard Park', 'North End'], featured: false },
  { id: 'con', name: 'Concord', region: 'New Hampshire', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-71.5376, 43.2081], neighborhoods: ['Downtown', 'South End', 'West Concord'], featured: false },
  { id: 'aug-me', name: 'Augusta', region: 'Maine', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-69.7795, 44.3106], neighborhoods: ['Downtown', 'Hallowell', 'East Side'], featured: false },
  { id: 'prov', name: 'Providence', region: 'Rhode Island', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-71.4128, 41.8240], neighborhoods: ['Federal Hill', 'College Hill', 'Downtown'], featured: false },
  { id: 'har-ct', name: 'Hartford', region: 'Connecticut', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-72.6851, 41.7658], neighborhoods: ['Downtown', 'West End', 'Asylum Hill'], featured: false },
  { id: 'dov', name: 'Dover', region: 'Delaware', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-75.5277, 39.1582], neighborhoods: ['Downtown', 'Capitol District', 'North Dover'], featured: false },
  { id: 'ann', name: 'Annapolis', region: 'Maryland', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-76.4924, 38.9784], neighborhoods: ['Downtown', 'Eastport', 'Murray Hill'], featured: false },
  { id: 'jef', name: 'Jefferson City', region: 'Missouri', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-92.1735, 38.5767], neighborhoods: ['Downtown', 'Capitol View', 'East Side'], featured: false },
  { id: 'des', name: 'Des Moines', region: 'Iowa', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-93.6091, 41.5868], neighborhoods: ['East Village', 'Beaverdale', 'Sherman Hill'], featured: false },
  { id: 'sp', name: 'St. Paul', region: 'Minnesota', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-93.0900, 44.9537], neighborhoods: ['Downtown', 'Cathedral Hill', 'Summit Hill'], featured: false },
  { id: 'cs', name: 'Carson City', region: 'Nevada', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-119.7674, 39.1638], neighborhoods: ['Downtown', 'West Side', 'East Side'], featured: false },
  { id: 'sf-nm', name: 'Santa Fe', region: 'New Mexico', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-105.9378, 35.6870], neighborhoods: ['The Plaza', 'Canyon Road', 'Railyard'], featured: false },
  { id: 'olu', name: 'Olympia', region: 'Washington', countryCode: 'US', status: 'waitlist', scouts: 0, center: [-122.9007, 47.0379], neighborhoods: ['Downtown', 'West Side', 'East Side'], featured: false },

  // ============ International — kept from prior version ============
  { id: 'ldn', name: 'London', region: 'England', countryCode: 'GB', status: 'soon', scouts: 0, center: [-0.1278, 51.5074], neighborhoods: ['Mayfair', 'Soho', 'Shoreditch', 'Chelsea', 'Knightsbridge', 'Notting Hill'], featured: true },
  { id: 'tor', name: 'Toronto', region: 'Ontario', countryCode: 'CA', status: 'soon', scouts: 0, center: [-79.3832, 43.6532], neighborhoods: ['Downtown', 'Yorkville', 'Distillery District', 'King West'], featured: true },
  { id: 'van', name: 'Vancouver', region: 'British Columbia', countryCode: 'CA', status: 'soon', scouts: 0, center: [-123.1207, 49.2827], neighborhoods: ['Downtown', 'Yaletown', 'Gastown', 'Kitsilano'], featured: false },
  { id: 'dxb', name: 'Dubai', region: 'Dubai', countryCode: 'AE', status: 'soon', scouts: 0, center: [55.2708, 25.2048], neighborhoods: ['Downtown', 'JBR', 'Palm Jumeirah', 'DIFC'], featured: true },
  { id: 'sgp', name: 'Singapore', region: 'Singapore', countryCode: 'SG', status: 'waitlist', scouts: 0, center: [103.8198, 1.3521], neighborhoods: ['Orchard', 'Marina Bay', 'Sentosa', 'Tanjong Pagar'], featured: false },
  { id: 'bali', name: 'Bali', region: 'Bali', countryCode: 'ID', status: 'waitlist', scouts: 0, center: [115.1889, -8.4095], neighborhoods: ['Canggu', 'Uluwatu', 'Seminyak', 'Ubud', 'Sanur'], featured: false },
  { id: 'syd', name: 'Sydney', region: 'New South Wales', countryCode: 'AU', status: 'waitlist', scouts: 0, center: [151.2093, -33.8688], neighborhoods: ['CBD', 'Bondi', 'Surry Hills', 'Newtown'], featured: false },
  { id: 'cdmx', name: 'Mexico City', region: 'CDMX', countryCode: 'MX', status: 'waitlist', scouts: 0, center: [-99.1332, 19.4326], neighborhoods: ['Roma', 'Condesa', 'Polanco', 'Coyoacán'], featured: false },
];

export const VENUES: Venue[] = [
  // Miami — broad utility coverage (DMV, airport, restaurants, events, retail)
  { name: 'E11EVEN', address: '29 NE 11th St, Downtown Miami', category: 'Nightclub', coord: [-80.1962, 25.7831], marketId: 'mia', partner: true },
  { name: 'LIV Nightclub', address: 'Fontainebleau, Miami', category: 'Nightclub', coord: [-80.1228, 25.8186], marketId: 'mia', partner: true },
  { name: 'Story', address: 'South Beach, Miami', category: 'Nightclub', coord: [-80.1300, 25.7790], marketId: 'mia' },
  { name: 'Komodo', address: 'Brickell, Miami', category: 'Restaurant', coord: [-80.1932, 25.7651], marketId: 'mia', partner: true },
  { name: "Joe's Stone Crab", address: 'South Beach, Miami', category: 'Restaurant', coord: [-80.1390, 25.7691], marketId: 'mia' },
  { name: 'Nikki Beach Miami', address: 'Ocean Dr, Miami Beach', category: 'Beach Club', coord: [-80.1255, 25.7677], marketId: 'mia' },
  { name: 'Soho House Miami Beach', address: 'South Beach, Miami', category: 'Members Club', coord: [-80.1300, 25.7858], marketId: 'mia', partner: true },
  { name: 'W South Beach', address: 'South Beach, Miami', category: 'Hotel', coord: [-80.1228, 25.7960], marketId: 'mia', partner: true },
  { name: 'Equinox Brickell', address: 'Miami Avenue, Miami', category: 'Gym', coord: [-80.1928, 25.7660], marketId: 'mia' },
  { name: 'MIA Terminal D', address: 'Miami International Airport', category: 'Airport', coord: [-80.2901, 25.7951], marketId: 'mia' },
  { name: 'DMV - Miami Beach', address: '101 5th St, Miami Beach', category: 'DMV', coord: [-80.1373, 25.7768], marketId: 'mia' },
  { name: 'Bal Harbour Shops', address: 'Bal Harbour, Miami', category: 'Retail', coord: [-80.1265, 25.8884], marketId: 'mia' },
  { name: 'Miami Heat Arena', address: 'Kaseya Center, Miami', category: 'Events', coord: [-80.1869, 25.7814], marketId: 'mia' },
  { name: 'loanDepot park', address: 'Marlins Stadium, Miami', category: 'Events', coord: [-80.2197, 25.7781], marketId: 'mia' },
  { name: 'Dolphin Mall', address: 'Doral, Miami', category: 'Retail', coord: [-80.4097, 25.7891], marketId: 'mia' },
  { name: 'Whole Foods Wynwood', address: 'Wynwood, Miami', category: 'Retail', coord: [-80.1990, 25.8014], marketId: 'mia' },

  // NYC — broad utility coverage
  { name: 'Carbone', address: 'Greenwich Village, NYC', category: 'Restaurant', coord: [-74.0006, 40.7290], marketId: 'nyc' },
  { name: 'JFK Terminal 4', address: 'Queens, New York', category: 'Airport', coord: [-73.7795, 40.6443], marketId: 'nyc' },
  { name: 'LaGuardia Terminal B', address: 'Queens, New York', category: 'Airport', coord: [-73.8740, 40.7769], marketId: 'nyc' },
  { name: 'Madison Square Garden', address: 'Penn Plaza, New York', category: 'Events', coord: [-73.9934, 40.7505], marketId: 'nyc' },
  { name: 'Yankee Stadium', address: 'Bronx, New York', category: 'Events', coord: [-73.9262, 40.8296], marketId: 'nyc' },
  { name: 'Citi Field', address: 'Queens, New York', category: 'Events', coord: [-73.8458, 40.7571], marketId: 'nyc' },
  { name: 'DMV - Manhattan', address: '11 Greenwich St, NYC', category: 'DMV', coord: [-74.0140, 40.7058], marketId: 'nyc' },
  { name: 'Apple Fifth Avenue', address: '767 5th Ave, NYC', category: 'Retail', coord: [-73.9737, 40.7637], marketId: 'nyc' },
  { name: 'Equinox Hudson Yards', address: '33 Hudson Yards, NYC', category: 'Gym', coord: [-74.0014, 40.7536], marketId: 'nyc' },
  { name: 'Soho House New York', address: 'Meatpacking, New York', category: 'Members Club', coord: [-74.0080, 40.7407], marketId: 'nyc' },
  { name: 'Marquee New York', address: 'Chelsea, NYC', category: 'Nightclub', coord: [-74.0048, 40.7470], marketId: 'nyc' },
  { name: 'Whole Foods Tribeca', address: 'Tribeca, NYC', category: 'Retail', coord: [-74.0118, 40.7173], marketId: 'nyc' },
  { name: 'Marriott Marquis Times Square', address: 'Times Square, NYC', category: 'Hotel', coord: [-73.9857, 40.7589], marketId: 'nyc' },

  // LA — sample utility venues
  { name: 'LAX Terminal 7', address: 'Los Angeles Airport', category: 'Airport', coord: [-118.4053, 33.9425], marketId: 'lax' },
  { name: 'Dodger Stadium', address: 'Elysian Park, LA', category: 'Events', coord: [-118.2400, 34.0739], marketId: 'lax' },
  { name: 'SoFi Stadium', address: 'Inglewood, California', category: 'Events', coord: [-118.3387, 33.9534], marketId: 'lax' },
  { name: 'Hollywood Bowl', address: 'Hollywood, LA', category: 'Events', coord: [-118.3398, 34.1122], marketId: 'lax' },
  { name: 'Nobu Malibu', address: 'Malibu, California', category: 'Restaurant', coord: [-118.6748, 34.0381], marketId: 'lax' },
  { name: 'Erewhon Santa Monica', address: 'Santa Monica, California', category: 'Retail', coord: [-118.4912, 34.0195], marketId: 'lax' },
  { name: 'Four Seasons Beverly Hills', address: 'Beverly Hills, CA', category: 'Hotel', coord: [-118.4060, 34.0696], marketId: 'lax' },
  { name: 'DMV - Hollywood', address: 'Hollywood, LA', category: 'DMV', coord: [-118.3399, 34.0917], marketId: 'lax' },

  // Chicago
  { name: "O'Hare Terminal 3", address: 'Chicago', category: 'Airport', coord: [-87.9073, 41.9742], marketId: 'chi' },
  { name: 'Wrigley Field', address: 'Lakeview, Chicago', category: 'Events', coord: [-87.6553, 41.9484], marketId: 'chi' },
  { name: 'United Center', address: 'West Side, Chicago', category: 'Events', coord: [-87.6742, 41.8807], marketId: 'chi' },
  { name: 'Alinea', address: 'Lincoln Park, Chicago', category: 'Restaurant', coord: [-87.6477, 41.9131], marketId: 'chi' },

  // Las Vegas
  { name: 'LAS Terminal 1', address: 'Harry Reid Intl, Las Vegas', category: 'Airport', coord: [-115.1556, 36.0840], marketId: 'lv' },
  { name: 'Allegiant Stadium', address: 'The Strip, Las Vegas', category: 'Events', coord: [-115.1830, 36.0908], marketId: 'lv' },
  { name: 'Sphere', address: 'The Strip, Las Vegas', category: 'Events', coord: [-115.1675, 36.1218], marketId: 'lv' },

  // DC
  { name: 'DCA Terminal 2', address: 'Reagan National Airport', category: 'Airport', coord: [-77.0405, 38.8512], marketId: 'dc' },
  { name: 'Capitol One Arena', address: 'Downtown, Washington DC', category: 'Events', coord: [-77.0207, 38.8981], marketId: 'dc' },
  { name: 'Echostage', address: 'NE, Washington DC', category: 'Nightclub', coord: [-76.9712, 38.9213], marketId: 'dc' },
  { name: 'Minibar by José Andrés', address: 'Penn Quarter, DC', category: 'Restaurant', coord: [-77.0238, 38.8965], marketId: 'dc' },
  { name: 'Rasika', address: 'Penn Quarter, DC', category: 'Restaurant', coord: [-77.0214, 38.8960], marketId: 'dc' },
  { name: 'Nationals Park', address: 'Navy Yard, DC', category: 'Events', coord: [-77.0075, 38.8730], marketId: 'dc' },
  { name: 'IAD Main Terminal', address: 'Dulles International Airport', category: 'Airport', coord: [-77.4565, 38.9531], marketId: 'dc' },
  { name: 'DMV - Georgetown', address: 'Georgetown, DC', category: 'DMV', coord: [-77.0654, 38.9097], marketId: 'dc' },

  // New Orleans
  { name: 'Republic NOLA', address: 'Warehouse District, New Orleans', category: 'Nightclub', coord: [-90.0712, 29.9434], marketId: 'no' },
  { name: 'The Sazerac Bar', address: 'Roosevelt Hotel, New Orleans', category: 'Nightclub', coord: [-90.0712, 29.9534], marketId: 'no' },
  { name: "Commander's Palace", address: 'Garden District, New Orleans', category: 'Restaurant', coord: [-90.0843, 29.9293], marketId: 'no' },
  { name: 'Acme Oyster House', address: 'French Quarter, New Orleans', category: 'Restaurant', coord: [-90.0682, 29.9542], marketId: 'no' },
  { name: 'Caesars Superdome', address: 'Downtown, New Orleans', category: 'Events', coord: [-90.0812, 29.9509], marketId: 'no' },
  { name: 'MSY Terminal C', address: 'Louis Armstrong Intl Airport', category: 'Airport', coord: [-90.2587, 29.9934], marketId: 'no' },
  { name: 'DMV - Marigny', address: 'Marigny, New Orleans', category: 'DMV', coord: [-90.0571, 29.9659], marketId: 'no' },

  // Nashville
  { name: "Tootsie's Orchid Lounge", address: 'Broadway, Nashville', category: 'Nightclub', coord: [-86.7763, 36.1612], marketId: 'nas' },
  { name: 'The Stage on Broadway', address: 'Broadway, Nashville', category: 'Nightclub', coord: [-86.7768, 36.1613], marketId: 'nas' },
  { name: 'Husk Nashville', address: 'Rutledge Hill, Nashville', category: 'Restaurant', coord: [-86.7750, 36.1551], marketId: 'nas' },
  { name: 'Hampton Social', address: 'The Gulch, Nashville', category: 'Restaurant', coord: [-86.7902, 36.1521], marketId: 'nas' },
  { name: 'Bridgestone Arena', address: 'Downtown, Nashville', category: 'Events', coord: [-86.7785, 36.1591], marketId: 'nas' },
  { name: 'BNA Terminal', address: 'Nashville International Airport', category: 'Airport', coord: [-86.6781, 36.1245], marketId: 'nas' },
  { name: 'DMV - Centennial', address: 'Centennial Blvd, Nashville', category: 'DMV', coord: [-86.8351, 36.1455], marketId: 'nas' },

  // Atlanta
  { name: 'Tongue & Groove', address: 'Lindbergh, Atlanta', category: 'Nightclub', coord: [-84.3691, 33.8232], marketId: 'atl' },
  { name: 'Magic City', address: 'Downtown, Atlanta', category: 'Nightclub', coord: [-84.3920, 33.7508], marketId: 'atl' },
  { name: 'The Capital Grille', address: 'Buckhead, Atlanta', category: 'Restaurant', coord: [-84.3650, 33.8472], marketId: 'atl' },
  { name: 'Bacchanalia', address: 'West Midtown, Atlanta', category: 'Restaurant', coord: [-84.4112, 33.7917], marketId: 'atl' },
  { name: 'Mercedes-Benz Stadium', address: 'Downtown, Atlanta', category: 'Events', coord: [-84.4008, 33.7553], marketId: 'atl' },
  { name: 'ATL Terminal F', address: 'Hartsfield-Jackson Atlanta', category: 'Airport', coord: [-84.4277, 33.6407], marketId: 'atl' },
  { name: 'DMV - Lenox', address: 'Buckhead, Atlanta', category: 'DMV', coord: [-84.3622, 33.8462], marketId: 'atl' },

  // Austin
  { name: 'Star Bar', address: 'West 6th, Austin', category: 'Nightclub', coord: [-97.7466, 30.2682], marketId: 'aus' },
  { name: "Antone's", address: 'Downtown, Austin', category: 'Nightclub', coord: [-97.7437, 30.2691], marketId: 'aus' },
  { name: 'Franklin Barbecue', address: 'East Austin', category: 'Restaurant', coord: [-97.7311, 30.2701], marketId: 'aus' },
  { name: 'Uchi', address: 'South Lamar, Austin', category: 'Restaurant', coord: [-97.7672, 30.2592], marketId: 'aus' },
  { name: 'Moody Center', address: 'UT Campus, Austin', category: 'Events', coord: [-97.7322, 30.2851], marketId: 'aus' },
  { name: 'AUS Barbara Jordan Terminal', address: 'Austin-Bergstrom Intl Airport', category: 'Airport', coord: [-97.6700, 30.1975], marketId: 'aus' },
  { name: 'DMV - North Austin', address: 'N Lamar, Austin', category: 'DMV', coord: [-97.7261, 30.3493], marketId: 'aus' },

  // San Francisco
  { name: 'Audio', address: 'SoMa, San Francisco', category: 'Nightclub', coord: [-122.4127, 37.7702], marketId: 'sf' },
  { name: 'The View Lounge', address: 'Marriott Marquis, SF', category: 'Nightclub', coord: [-122.4035, 37.7849], marketId: 'sf' },
  { name: 'Saison', address: 'SoMa, San Francisco', category: 'Restaurant', coord: [-122.3922, 37.7825], marketId: 'sf' },
  { name: 'State Bird Provisions', address: 'Fillmore, San Francisco', category: 'Restaurant', coord: [-122.4364, 37.7831], marketId: 'sf' },
  { name: 'Chase Center', address: 'Mission Bay, San Francisco', category: 'Events', coord: [-122.3879, 37.7680], marketId: 'sf' },
  { name: 'SFO Terminal 2', address: 'San Francisco International Airport', category: 'Airport', coord: [-122.3845, 37.6147], marketId: 'sf' },
  { name: 'DMV - Fell Street', address: 'Hayes Valley, San Francisco', category: 'DMV', coord: [-122.4256, 37.7758], marketId: 'sf' },

  // Houston
  { name: 'Clé Houston', address: 'Downtown, Houston', category: 'Nightclub', coord: [-95.3635, 29.7556], marketId: 'hou' },
  { name: 'Concrete Cowboy', address: 'Washington Ave, Houston', category: 'Nightclub', coord: [-95.4007, 29.7707], marketId: 'hou' },
  { name: 'Underbelly Hospitality', address: 'Montrose, Houston', category: 'Restaurant', coord: [-95.3914, 29.7444], marketId: 'hou' },
  { name: "Killen's Steakhouse", address: 'Pearland, Houston', category: 'Restaurant', coord: [-95.2902, 29.5662], marketId: 'hou' },
  { name: 'NRG Stadium', address: 'South Main, Houston', category: 'Events', coord: [-95.4107, 29.6847], marketId: 'hou' },
  { name: 'IAH Terminal A', address: 'George Bush Intercontinental', category: 'Airport', coord: [-95.3414, 29.9902], marketId: 'hou' },
  { name: 'DMV - Gessner', address: 'Spring Branch, Houston', category: 'DMV', coord: [-95.5604, 29.7919], marketId: 'hou' },

  // Dallas
  { name: 'Lava Cantina', address: 'The Colony, Dallas', category: 'Nightclub', coord: [-96.8902, 33.0884], marketId: 'dal' },
  { name: 'Mansion on Turtle Creek', address: 'Uptown, Dallas', category: 'Restaurant', coord: [-96.8085, 32.8027], marketId: 'dal' },
  { name: 'Pappas Bros Steakhouse', address: 'Uptown, Dallas', category: 'Restaurant', coord: [-96.8042, 32.8133], marketId: 'dal' },
  { name: 'AT&T Stadium', address: 'Arlington, Dallas', category: 'Events', coord: [-97.0929, 32.7473], marketId: 'dal' },
  { name: 'American Airlines Center', address: 'Victory Park, Dallas', category: 'Events', coord: [-96.8104, 32.7905], marketId: 'dal' },
  { name: 'DFW Terminal D', address: 'Dallas/Fort Worth Intl Airport', category: 'Airport', coord: [-97.0395, 32.8998], marketId: 'dal' },
  { name: 'DMV - Garland', address: 'Garland, Dallas', category: 'DMV', coord: [-96.6389, 32.9126], marketId: 'dal' },

  // Phoenix
  { name: 'Maya Day + Nightclub', address: 'Old Town Scottsdale', category: 'Nightclub', coord: [-111.9264, 33.4942], marketId: 'phx' },
  { name: 'Wrigley Mansion', address: 'Biltmore, Phoenix', category: 'Restaurant', coord: [-112.0265, 33.5135], marketId: 'phx' },
  { name: 'Pizzeria Bianco', address: 'Downtown, Phoenix', category: 'Restaurant', coord: [-112.0654, 33.4496], marketId: 'phx' },
  { name: 'State Farm Stadium', address: 'Glendale, Phoenix', category: 'Events', coord: [-112.2626, 33.5276], marketId: 'phx' },
  { name: 'Footprint Center', address: 'Downtown, Phoenix', category: 'Events', coord: [-112.0712, 33.4458], marketId: 'phx' },
  { name: 'PHX Terminal 4', address: 'Sky Harbor International Airport', category: 'Airport', coord: [-112.0099, 33.4373], marketId: 'phx' },
  { name: 'DMV - Mesa', address: 'Mesa, Phoenix', category: 'DMV', coord: [-111.8315, 33.4152], marketId: 'phx' },

  // Seattle
  { name: 'Q Nightclub', address: 'Capitol Hill, Seattle', category: 'Nightclub', coord: [-122.3201, 47.6164], marketId: 'sea' },
  { name: 'Trinity Nightclub', address: 'Pioneer Square, Seattle', category: 'Nightclub', coord: [-122.3340, 47.6011], marketId: 'sea' },
  { name: 'Canlis', address: 'Queen Anne, Seattle', category: 'Restaurant', coord: [-122.3477, 47.6437], marketId: 'sea' },
  { name: 'The Pink Door', address: 'Pike Place, Seattle', category: 'Restaurant', coord: [-122.3424, 47.6094], marketId: 'sea' },
  { name: 'T-Mobile Park', address: 'SoDo, Seattle', category: 'Events', coord: [-122.3326, 47.5914], marketId: 'sea' },
  { name: 'SEA Main Terminal', address: 'Seattle-Tacoma International Airport', category: 'Airport', coord: [-122.3088, 47.4502], marketId: 'sea' },
  { name: 'DMV - Downtown Seattle', address: 'Downtown, Seattle', category: 'DMV', coord: [-122.3343, 47.6116], marketId: 'sea' },

  // Denver
  { name: 'Beta Nightclub', address: 'LoDo, Denver', category: 'Nightclub', coord: [-104.9985, 39.7531], marketId: 'den' },
  { name: 'Mercantile Dining', address: 'Union Station, Denver', category: 'Restaurant', coord: [-105.0019, 39.7530], marketId: 'den' },
  { name: 'The Capital Grille Denver', address: 'Larimer Square, Denver', category: 'Restaurant', coord: [-104.9994, 39.7475], marketId: 'den' },
  { name: 'Empower Field at Mile High', address: 'Sun Valley, Denver', category: 'Events', coord: [-105.0201, 39.7439], marketId: 'den' },
  { name: 'Ball Arena', address: 'Auraria, Denver', category: 'Events', coord: [-105.0076, 39.7487], marketId: 'den' },
  { name: 'DEN Terminal C', address: 'Denver International Airport', category: 'Airport', coord: [-104.6737, 39.8617], marketId: 'den' },
  { name: 'DMV - Northeast Park Hill', address: 'Park Hill, Denver', category: 'DMV', coord: [-104.9224, 39.7651], marketId: 'den' },

  // Boston
  { name: 'The Grand Boston', address: 'Seaport, Boston', category: 'Nightclub', coord: [-71.0426, 42.3505], marketId: 'bos' },
  { name: 'Big Night Live', address: 'TD Garden, Boston', category: 'Nightclub', coord: [-71.0631, 42.3661], marketId: 'bos' },
  { name: 'O Ya', address: 'Leather District, Boston', category: 'Restaurant', coord: [-71.0588, 42.3503], marketId: 'bos' },
  { name: 'Neptune Oyster', address: 'North End, Boston', category: 'Restaurant', coord: [-71.0552, 42.3635], marketId: 'bos' },
  { name: 'TD Garden', address: 'West End, Boston', category: 'Events', coord: [-71.0621, 42.3662], marketId: 'bos' },
  { name: 'BOS Terminal C', address: 'Logan International Airport', category: 'Airport', coord: [-71.0096, 42.3656], marketId: 'bos' },
  { name: 'DMV - Haymarket', address: 'Government Center, Boston', category: 'DMV', coord: [-71.0588, 42.3614], marketId: 'bos' },

  // San Diego
  { name: 'Parq Nightclub', address: 'Gaslamp Quarter, San Diego', category: 'Nightclub', coord: [-117.1573, 32.7110], marketId: 'sd' },
  { name: 'Hard Rock Rooftop', address: 'Gaslamp Quarter, San Diego', category: 'Nightclub', coord: [-117.1591, 32.7095], marketId: 'sd' },
  { name: 'Addison', address: 'Carmel Valley, San Diego', category: 'Restaurant', coord: [-117.2087, 32.9404], marketId: 'sd' },
  { name: 'Born & Raised', address: 'Little Italy, San Diego', category: 'Restaurant', coord: [-117.1693, 32.7242], marketId: 'sd' },
  { name: 'Petco Park', address: 'East Village, San Diego', category: 'Events', coord: [-117.1573, 32.7073], marketId: 'sd' },
  { name: 'SAN Terminal 2', address: 'San Diego International Airport', category: 'Airport', coord: [-117.1933, 32.7338], marketId: 'sd' },
  { name: 'DMV - Normal Heights', address: 'Normal Heights, San Diego', category: 'DMV', coord: [-117.1255, 32.7644], marketId: 'sd' },

  // Orlando
  { name: 'Tier Nightclub', address: 'Downtown, Orlando', category: 'Nightclub', coord: [-81.3812, 28.5421], marketId: 'orl' },
  { name: 'The Edison', address: 'Disney Springs, Orlando', category: 'Nightclub', coord: [-81.5197, 28.3697], marketId: 'orl' },
  { name: "Victoria & Albert's", address: 'Grand Floridian, Orlando', category: 'Restaurant', coord: [-81.5839, 28.4116], marketId: 'orl' },
  { name: 'The Ravenous Pig', address: 'Winter Park, Orlando', category: 'Restaurant', coord: [-81.3578, 28.5915], marketId: 'orl' },
  { name: 'Camping World Stadium', address: 'Downtown, Orlando', category: 'Events', coord: [-81.4015, 28.5392], marketId: 'orl' },
  { name: 'MCO Terminal A', address: 'Orlando International Airport', category: 'Airport', coord: [-81.3081, 28.4312], marketId: 'orl' },
  { name: 'DMV - Lake Underhill', address: 'Lake Underhill Rd, Orlando', category: 'DMV', coord: [-81.3232, 28.5396], marketId: 'orl' },

  // Philadelphia
  { name: 'Vango Lounge', address: 'Center City, Philadelphia', category: 'Nightclub', coord: [-75.1645, 39.9501], marketId: 'phi' },
  { name: 'Howl at the Moon', address: 'Old City, Philadelphia', category: 'Nightclub', coord: [-75.1432, 39.9486], marketId: 'phi' },
  { name: 'Vetri Cucina', address: 'Center City, Philadelphia', category: 'Restaurant', coord: [-75.1670, 39.9474], marketId: 'phi' },
  { name: 'Zahav', address: 'Society Hill, Philadelphia', category: 'Restaurant', coord: [-75.1462, 39.9466], marketId: 'phi' },
  { name: 'Lincoln Financial Field', address: 'South Philly, Philadelphia', category: 'Events', coord: [-75.1675, 39.9008], marketId: 'phi' },
  { name: 'PHL Terminal A', address: 'Philadelphia International Airport', category: 'Airport', coord: [-75.2424, 39.8744], marketId: 'phi' },
  { name: 'DMV - Center City', address: 'Center City, Philadelphia', category: 'DMV', coord: [-75.1620, 39.9536], marketId: 'phi' },

  // International
  { name: 'Heathrow Terminal 5', address: 'London Heathrow Airport', category: 'Airport', coord: [-0.4882, 51.4720], marketId: 'ldn' },
  { name: "Annabel's Mayfair", address: 'Mayfair, London', category: 'Members Club', coord: [-0.1430, 51.5074], marketId: 'ldn' },
  { name: 'Selfridges Oxford Street', address: 'Oxford St, London', category: 'Retail', coord: [-0.1525, 51.5145], marketId: 'ldn' },
  { name: 'Marina Bay Sands', address: 'Marina Bay, Singapore', category: 'Hotel', coord: [103.8607, 1.2834], marketId: 'sgp' },
  { name: 'Burj Al Arab', address: 'Jumeirah, Dubai', category: 'Hotel', coord: [55.1853, 25.1413], marketId: 'dxb' },
  { name: 'Potato Head Beach Club', address: 'Seminyak, Bali', category: 'Beach Club', coord: [115.1568, -8.6925], marketId: 'bali' },
];

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getMarketById(id: string): Market | undefined {
  return MARKETS.find((m) => m.id === id);
}

export function getMarketsForCountry(countryCode: string): Market[] {
  return MARKETS.filter((m) => m.countryCode === countryCode);
}

export function getLiveMarkets(): Market[] {
  return MARKETS.filter((m) => m.status === 'live');
}

/** Great-circle distance in km between two [lon, lat] points (Haversine). */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Serviceable radius (km) around a live market's centre. */
export const MARKET_RADIUS_KM = 80;

/**
 * Resolve the user's real coordinates to the nearest LIVE market.
 * `inMarket` is true only when the user is within MARKET_RADIUS_KM of that
 * market's centre. When false (or no live markets exist), we fall back to the
 * default launch market so the experience still has content to show.
 */
export function nearestLiveMarket(coords: [number, number]): {
  market: Market;
  distanceKm: number;
  inMarket: boolean;
} {
  const fallback = getMarketById(DEFAULT_MARKET_ID)!;
  const live = getLiveMarkets();
  if (live.length === 0) {
    return { market: fallback, distanceKm: Infinity, inMarket: false };
  }
  let best = live[0];
  let bestDist = Infinity;
  for (const m of live) {
    const d = distanceKm(coords, m.center);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  const inMarket = bestDist <= MARKET_RADIUS_KM;
  return { market: inMarket ? best : fallback, distanceKm: bestDist, inMarket };
}

export function getVenuesForMarket(marketId: string): Venue[] {
  return VENUES.filter((v) => v.marketId === marketId);
}

export function getVenueByName(name: string): Venue | undefined {
  return VENUES.find((v) => v.name === name);
}

export function isPartnerVenue(name: string | null | undefined): boolean {
  if (!name) return false;
  const v = getVenueByName(name);
  return !!v?.partner;
}

/**
 * Resolve a venue's effective filming policy.
 * Per-venue override > category default > 'yellow' (cautious fallback).
 */
export function getVenueFilmingPolicy(venue: Venue): FilmingPolicy {
  if (venue.filmingPolicy) return venue.filmingPolicy;
  return CATEGORY_FILMING_DEFAULTS[venue.category] ?? 'yellow';
}

export type SearchResults = {
  cities: Market[];
  neighborhoods: { name: string; marketId: string }[];
  venues: Venue[];
};

export function searchInMarket(currentMarketId: string, query: string): SearchResults {
  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return { cities: [], neighborhoods: [], venues: [] };
  }

  const market = getMarketById(currentMarketId);
  const sameCountryCode = market?.countryCode;

  // Cities: scope to same country if known, otherwise global
  const cities = MARKETS.filter((m) => {
    if (sameCountryCode && m.countryCode !== sameCountryCode) return false;
    const hay = `${m.name} ${m.region} ${m.countryCode}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });

  // Neighborhoods: scoped to current market
  const neighborhoods = market
    ? market.neighborhoods
        .filter((n) => {
          const hay = n.toLowerCase();
          return tokens.every((t) => hay.includes(t));
        })
        .map((n) => ({ name: n, marketId: currentMarketId }))
    : [];

  // Venues: scoped to current market
  const venues = getVenuesForMarket(currentMarketId).filter((v) => {
    const hay = `${v.name} ${v.address} ${v.category}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });

  return {
    cities: cities.slice(0, 4),
    neighborhoods: neighborhoods.slice(0, 4),
    venues: venues.slice(0, 6),
  };
}
