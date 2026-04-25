# Sistema de Agentes — Football Connections

## Agentes disponibles

| Alias | Archivo | Rol |
|-------|---------|-----|
| `@orchestrator` | `00_orchestrator.md` | Coordina todos los agentes, descompone tareas, consolida outputs |
| `@backend-architect` | `01_backend_architect.md` | API, BD, real-time, ETL, lógica de juego server-side |
| `@frontend-architect` | `02_frontend_architect.md` | Páginas, componentes, estado cliente, WS cliente |
| `@functional` | `03_functional_agent.md` | Specs funcionales: qué, cómo se ve, cómo se usa, qué necesita |
| `@reviewer` | `04_reviewer.md` | Auditor de consistencia, seguridad y adherencia al stack |

---

## Cómo usar el sistema

### Petición simple → un agente directo

Si la petición es claramente de una sola capa, puedes invocar directamente:

```
@functional → spec de la pantalla de resultado
@backend-architect → endpoint de búsqueda de jugadores
@frontend-architect → componente PlayerInput con autocompletado
@reviewer → revisar diseño de ELO propuesto por backend
```

### Petición compleja → pasa por el Orchestrator

Si la petición implica múltiples capas o no está claro quién debe manejarla:

```
@orchestrator → "Quiero agregar un sistema de logros por racha de victorias"
```

El Orchestrator decide el orden y los agentes involucrados.

---

## Flujo de trabajo estándar para una feature nueva

```
Usuario
  │
  ▼
@orchestrator (clasifica y descompone)
  │
  ├──► @functional (spec funcional)
  │         │
  │         ▼
  │    @reviewer (valida la spec)
  │         │
  ├──► @backend-architect (diseño de API + BD)
  │         │
  ├──► @frontend-architect (diseño de UI + estado)
  │         │
  │         ▼
  │    @reviewer (valida backend + frontend por separado)
  │         │
  ▼
@orchestrator (consolida todo)
  │
  ├──► @reviewer (revisión cruzada final)
  │
  ▼
Output final al usuario
```

---

## Protocolo de activación (cómo invocar a un agente)

Al hablar con un agente, incluye siempre:

```
[CONTEXTO]
Proyecto: Football Connections multiplayer
Stack: Next.js 15 + Hono + Bun + PartyKit + Supabase + Drizzle + Upstash Redis
Refs: Documentacion/BD/README.md, Documentacion/Stack/README.md

[TAREA PARA @{alias}]
{descripción de la tarea}

[INPUT]
{información de contexto específica: spec previa, código existente, restricciones}

[OUTPUT ESPERADO]
{qué formato y nivel de detalle se espera}
```

---

## Jerarquía de fuentes de verdad

Cuando hay conflicto entre agentes, se resuelve en este orden:

1. `Documentacion/BD/README.md` — modelo de datos (no negociable)
2. `Documentacion/Stack/README.md` — tecnologías (no negociable)
3. Spec del `@functional` aprobada por `@reviewer`
4. Decisión del `@orchestrator`
5. Propuesta de `@backend-architect` o `@frontend-architect`

---

## Reglas globales del sistema

- Ningún agente puede aprobar su propio output. Siempre pasa por `@reviewer`.
- Ningún agente escribe código de producción sin que `@reviewer` haya emitido veredicto ✅.
- El `@orchestrator` es el único punto de entrada para peticiones multi-capa.
- Los agentes no se comunican directamente entre sí; el `@orchestrator` hace de intermediario.
- Si un agente no tiene suficiente contexto para responder, lo declara explícitamente y lista qué información necesita.
