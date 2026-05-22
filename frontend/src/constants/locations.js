export const COUNTRY_OPTIONS = ['Mexico', 'United States', 'Canada']

/**
 * ISO-3166-1 alpha-2 destinations the marketplace supports for ships-to.
 * Keep the list short and keeper-relevant; expand as we open new regions.
 */
export const SHIPS_TO_OPTIONS = [
  { code: 'MX', label: 'México' },
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'CO', label: 'Colombia' },
  { code: 'BR', label: 'Brasil' },
  { code: 'AR', label: 'Argentina' },
  { code: 'CL', label: 'Chile' },
  { code: 'PE', label: 'Perú' },
  { code: 'EC', label: 'Ecuador' },
  { code: 'ES', label: 'España' },
  { code: 'UY', label: 'Uruguay' },
  { code: 'CR', label: 'Costa Rica' },
]

/** Returns the country ISO code matching the (legacy long-form) country name in COUNTRY_OPTIONS. */
export const COUNTRY_NAME_TO_ISO = {
  Mexico: 'MX',
  'United States': 'US',
  Canada: 'CA',
  México: 'MX',
}

export const STATES_BY_COUNTRY = {
  Mexico: [
    'CDMX',
    'Estado de Mexico',
    'Jalisco',
    'Nuevo Leon',
    'Puebla',
    'Guanajuato',
    'Queretaro',
    'Yucatan',
    'Sonora',
    'Quintana Roo',
  ],
  'United States': [
    'California',
    'Texas',
    'Florida',
    'New York',
    'Illinois',
    'Arizona',
    'Washington',
  ],
  Canada: [
    'Ontario',
    'Quebec',
    'British Columbia',
    'Alberta',
  ],
}

export const CITIES_BY_STATE = {
  CDMX: ['Ciudad de Mexico'],
  'Estado de Mexico': ['Naucalpan', 'Tlalnepantla', 'Ecatepec', 'Toluca'],
  Jalisco: ['Guadalajara', 'Zapopan', 'Tlaquepaque'],
  'Nuevo Leon': ['Monterrey', 'San Nicolas', 'Guadalupe'],
  Puebla: ['Puebla', 'Tehuacan'],
  Guanajuato: ['Leon', 'Irapuato', 'Celaya'],
  Queretaro: ['Queretaro', 'San Juan del Rio'],
  Yucatan: ['Merida'],
  Sonora: ['Hermosillo'],
  'Quintana Roo': ['Cancun', 'Playa del Carmen'],
  California: ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco'],
  Texas: ['Houston', 'Dallas', 'Austin', 'San Antonio'],
  Florida: ['Miami', 'Orlando', 'Tampa'],
  'New York': ['New York City', 'Buffalo'],
  Arizona: ['Phoenix', 'Tucson'],
  Illinois: ['Chicago'],
  Washington: ['Seattle'],
  Ontario: ['Toronto', 'Ottawa', 'Mississauga'],
  Quebec: ['Montreal', 'Quebec City', 'Laval'],
  'British Columbia': ['Vancouver', 'Victoria', 'Surrey'],
  Alberta: ['Calgary', 'Edmonton'],
}
