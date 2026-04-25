# Documentación BD — Football Connections Multiplayer

## 1) Objetivo del juego

Construir un juego **multiplayer 1v1** con **matchmaking por ELO**.

- Dos jugadores se emparejan por rating similar.
- El sistema elige un jugador inicial aleatorio (ejemplo: Mbappé).
- Turno alternado:
  - Player 1 responde con un compañero válido del jugador actual (ejemplo: Neymar).
  - Player 2 responde con un compañero válido de la respuesta anterior (ejemplo: Messi).
  - Se repite en cadena.
- Pierde quien se quede sin tiempo.

---

## 2) Fuente de datos validada (lo que usaremos)

### Dataset principal

Dataset confirmado para este proyecto:

- Kaggle: https://www.kaggle.com/datasets/xfkzujqjvx97n/football-datasets
- Repo asociado: https://github.com/salimt/football-datasets

### Tabla clave

Usaremos de forma central la tabla/categoría:

- `player_teammates_played_with`

Campos esperados (según documentación pública del dataset):

- `player_id`
- `player_with_url`
- `player_with_name`
- `ppg_played_with`
- `joint_goal_participation`
- `minutes_played_with`

Además, para catálogo de jugadores y metadatos, usaremos:

- `player_profiles` (o equivalente de perfiles en el dataset)

---

## 3) Cómo transformaremos los datos para el juego

La tabla de teammates viene en formato orientado a análisis. Para juego en tiempo real, debemos normalizarla.

## 3.1 Entidad canónica de jugador

Crearemos una tabla interna `players` con identidad estable:

- `player_id` (PK, bigint)
- `player_name`
- `player_slug` (si existe)
- `normalized_name` (para búsqueda)
- `is_active` (bool)
- `source_updated_at`

Regla de oro: toda validación in-game usa `player_id` canónico.

## 3.2 Grafo de compañeros (edges)

Crearemos una tabla `teammate_edges` derivada:

- `player_id` (nodo origen)
- `teammate_id` (nodo destino)
- `minutes_played_with`
- `joint_goal_participation`
- `ppg_played_with`
- `weight_score` (métrica auxiliar para ranking de sugerencias)
- PK compuesta: (`player_id`, `teammate_id`)

### Normalización importante

- Resolver `teammate_id` desde `player_with_url` usando mapa slug/url → `player_id`.
- Si no se puede mapear de forma confiable, descartar ese edge para modo competitivo.
- Opcional (recomendado): guardar edges bidireccionales explícitos para consulta rápida.

## 3.3 Umbrales de calidad para modo ranked

Para evitar edges muy débiles:

- `minutes_played_with >= X` (ej. 90 o 180)
- o `joint_goal_participation >= 1`

Esto se define como configuración para balance del juego.

---

## 4) Modelo de BD para multiplayer con ELO

## 4.1 Usuarios

### `users`

- `id` (PK)
- `username` (único)
- `created_at`
- `is_banned`

### `player_ratings`

- `user_id` (PK/FK users.id)
- `elo` (default 1200)
- `matches_played`
- `wins`
- `losses`
- `draws`
- `updated_at`

### `rating_history`

- `id` (PK)
- `user_id`
- `match_id`
- `elo_before`
- `elo_after`
- `delta`
- `created_at`

## 4.2 Matchmaking

### `matchmaking_queue`

- `id` (PK)
- `user_id`
- `elo_snapshot`
- `queued_at`
- `region` (opcional)
- `status` (`queued`, `matched`, `cancelled`)

Emparejamiento sugerido:

- Ventana inicial ±50 ELO.
- Expandir cada N segundos (ej. +25) para reducir espera.

## 4.3 Partidas y turnos

### `matches`

- `id` (PK)
- `player1_user_id`
- `player2_user_id`
- `status` (`pending`, `active`, `finished`, `aborted`)
- `seed_player_id` (jugador inicial random)
- `current_player_id` (jugador que debe responder)
- `current_chain_player_id` (último jugador válido de la cadena)
- `turn_number`
- `turn_deadline_at`
- `winner_user_id` (nullable)
- `end_reason` (`timeout`, `resign`, `disconnect`, `normal`)  // NO incluye 'invalid_answer'
- `created_at`, `started_at`, `finished_at`

**Nota:** Los intentos inválidos se registran en `match_turns` con `is_valid=false`, pero NO terminan la partida.

### `match_turns`

- `id` (PK)
- `match_id`
- `turn_number`
- `acting_user_id`
- `input_text`
- `resolved_player_id` (nullable)
- `is_valid`
- `invalid_reason` (`not_found`, `not_teammate`, `already_used`, `timeout`, etc.)
- `response_ms`
- `created_at`

### `match_chain_nodes`

- `id` (PK)
- `match_id`
- `position` (0 = seed)
- `player_id`
- `played_by_user_id` (nullable en posición 0)
- `created_at`

Restricción clave:

- Unique (`match_id`, `player_id`) para impedir repetidos en la misma partida.

---

## 5) Lógica de validación (núcleo del juego)

Input del turno: nombre escrito por el jugador activo.

Pipeline recomendado:

1. Normalizar texto (`trim`, lowercase, quitar diacríticos).
2. Resolver candidato(s) en `players` por `normalized_name`.
3. Elegir match exacto o por estrategia de desambiguación.
4. Validar repetición:
   - si `player_id` ya existe en `match_chain_nodes` del match => inválido.
5. Validar conectividad:
   - debe existir edge en `teammate_edges` entre `current_chain_player_id` y `candidate_id`.
6. Si válido:
   - insertar en `match_turns` y `match_chain_nodes`.
   - avanzar `turn_number`.
   - actualizar `current_chain_player_id`.
   - alternar `current_player_id`.

Todo esto debe ejecutarse en **transacción** con lock de fila de partida para evitar dobles jugadas simultáneas.

---

## 6) Reglas competitivas (ranked)

- Tiempo por turno configurable (ej. 20–30s).
- Timeout = derrota automática.
- Respuesta inválida = derrota automática.
- Repetir jugador de la cadena = inválida.
- Si no hay respuesta posible (caso extremo), permitir:
  - `draw técnico`, o
  - `skip` limitado (regla opcional, no MVP).

Para MVP: mantener simple, sin skip.

---

## 7) ELO (cómo lo usaremos)

Actualización al terminar partida:

- Resultado: win/loss/draw.
- Fórmula esperada estándar:
  - `E_a = 1 / (1 + 10^((R_b - R_a)/400))`
  - `R'_a = R_a + K * (S_a - E_a)`
- `K` sugerido:
  - 32 en cuentas nuevas
  - 24 intermedio
  - 16 estable (muchas partidas)

Guardar siempre en `rating_history` para trazabilidad y auditoría.

---

## 8) Índices recomendados (rendimiento)

- `players(normalized_name)`
- `teammate_edges(player_id, teammate_id)`
- `teammate_edges(player_id)`
- `match_chain_nodes(match_id, player_id)` (unique)
- `match_turns(match_id, turn_number)`
- `matchmaking_queue(status, queued_at, elo_snapshot)`

---

## 9) Flujo operativo (ETL + juego)

## 9.1 ETL inicial

1. Descargar CSV del dataset.
2. Poblar `players`.
3. Construir mapa URL/slug → `player_id`.
4. Transformar `player_teammates_played_with` → `teammate_edges`.
5. Aplicar filtros de calidad (minutes/participation).
6. Crear índices.

## 9.2 Actualización periódica

- Frecuencia sugerida: semanal o quincenal.
- Estrategia: upsert por `player_id` y por (`player_id`, `teammate_id`).
- Versionar corrida ETL para poder rollback.

---

## 10) API mínima que depende de esta BD

- `POST /matchmaking/join`
- `POST /matchmaking/leave`
- `GET /matches/{id}`
- `POST /matches/{id}/play` (input de nombre)
- `GET /matches/{id}/history`
- `GET /leaderboard`

---

## 11) Riesgos y mitigaciones

- Ambigüedad de nombres de jugador:
  - Mitigar con `player_id` interno + resolver por slug/url.
- Edges incompletos o sucios:
  - Filtro de calidad y lista de exclusión.
- Concurrencia en tiempo real:
  - Transacciones + lock por partida.
- Ventaja por conocimiento extremo de nicho:
  - Considerar pool por era/liga en futuras temporadas.

---

## 12) Alcance MVP acordado

Este documento deja explícito que, para el MVP:

- Sí usamos dataset tipo Transfermarkt con `player_teammates_played_with`.
- Sí usamos matchmaking con ELO.
- Sí usamos partidas 1v1 por turnos con cadena de teammates.
- No incluimos todavía modos extra (torneos, 2v2, boosters, etc.).

---

## 13) Ejemplo de ronda (como referencia funcional)

- Seed random: Mbappé
- Turno P1: Neymar (válido si existe edge Mbappé → Neymar)
- Turno P2: Messi (válido si existe edge Neymar → Messi)
- Turno P1: Di María (válido si existe edge Messi → Di María)
- ... hasta error o timeout.

Este ejemplo define exactamente el comportamiento objetivo del motor de validación en BD + backend.
