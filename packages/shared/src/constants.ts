/**
 * Configuración del juego
 */
export const GAME_CONFIG = {
  // Tiempo por turno (en segundos)
  TURN_TIME_SECONDS: 20,
  
  // Tiempo de gracia para reconexión (10 segundos)
  DISCONNECT_GRACE_PERIOD_MS: 10000,
  
  // Rango inicial de ELO para matchmaking
  MATCHMAKING_INITIAL_RANGE: 50,
  
  // Incremento de rango cada 10 segundos
  MATCHMAKING_RANGE_INCREMENT: 25,
  
  // Tiempo máximo en cola (5 minutos)
  MATCHMAKING_MAX_WAIT_TIME_MS: 5 * 60 * 1000,
  
  // ELO inicial para nuevos jugadores
  INITIAL_ELO: 1200,
  
  // Factores K para cálculo de ELO
  ELO_K_HIGH: 40,    // < 30 partidas
  ELO_K_MEDIUM: 20,  // 30-100 partidas
  ELO_K_LOW: 10,     // > 100 partidas
  
  // Rate limiting
  RATE_LIMIT_AUTH: { max: 5, window: 60 },        // 5 requests per minute
  RATE_LIMIT_MATCHMAKING: { max: 10, window: 60 }, // 10 requests per minute
  
  // Session expiration
  SESSION_ACCESS_TOKEN_EXPIRY: 7 * 24 * 60 * 60,  // 7 days
  SESSION_REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60, // 30 days
} as const;

/**
 * Configuración de API
 */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  PARTYKIT_URL: process.env.NEXT_PUBLIC_PARTYKIT_URL || 'http://localhost:1999',
  TIMEOUT_MS: 10000,
} as const;

/**
 * Validación de nombres de jugadores
 */
export const PLAYER_NAME_VALIDATION = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 100,
  PATTERN: /^[a-zA-Z\s\-'.]+$/,
} as const;

/**
 * Paginación
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
