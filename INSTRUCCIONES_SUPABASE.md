# 🚀 Ejecutar Setup de Base de Datos en Supabase

## ⚠️ Problema de Conectividad Detectado

Hubo un problema de conectividad IPv6 entre tu máquina y Supabase que impidió ejecutar las migraciones automáticamente.

**✅ Solución:** Ejecutar el script SQL directamente en Supabase SQL Editor (toma 30 segundos).

---

## 📋 Instrucciones Paso a Paso

### 1️⃣ Abrir Supabase SQL Editor

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto: **football-connections**
3. En el menú lateral izquierdo, click en **SQL Editor**
4. Click en **New query**

### 2️⃣ Copiar el Script SQL

1. Abre el archivo: `scripts/EJECUTAR_EN_SUPABASE.sql`
2. Selecciona **TODO el contenido** (Ctrl+A)
3. Cópialo (Ctrl+C)

### 3️⃣ Ejecutar en Supabase

1. Pega el script en el SQL Editor de Supabase (Ctrl+V)
2. Click en el botón **Run** (o presiona F5)
3. Espera ~15 segundos mientras se ejecuta

### 4️⃣ Verificar Resultado

Deberías ver en la consola de salida:

```
✅ Base de datos configurada correctamente!
   - 8 tablas creadas
   - 17 índices creados
   - 3 extensiones habilitadas
   - RLS configurado en users y player_ratings
   - Triggers de updated_at activos
```

### 5️⃣ Verificar Tablas Creadas

1. En el menú lateral, click en **Table Editor**
2. Deberías ver estas 8 tablas:
   - ✅ `users`
   - ✅ `players`
   - ✅ `teammate_edges`
   - ✅ `matches`
   - ✅ `match_chain_nodes`
   - ✅ `match_turns`
   - ✅ `player_ratings`
   - ✅ `rating_history`

---

## ✅ ¿Qué hace este script?

### Paso 1: Extensiones PostgreSQL
- ✅ **pg_trgm** - Búsqueda fuzzy de nombres de jugadores
- ✅ **uuid-ossp** - Generación de UUIDs
- ✅ **pgcrypto** - Funciones de cifrado

### Paso 2: Tablas
- **users** - Cuentas de usuario vinculadas a Supabase Auth
- **players** - Catálogo de jugadores de fútbol (del dataset Kaggle)
- **teammate_edges** - Grafo de relaciones entre jugadores
- **matches** - Partidas 1v1 entre usuarios
- **match_turns** - Jugadas individuales dentro de cada partida
- **match_chain_nodes** - Cadena de jugadores construida en cada partida
- **player_ratings** - Rating ELO de cada usuario
- **rating_history** - Historial de cambios de ELO

### Paso 3: Foreign Keys
- Relaciones entre todas las tablas
- `ON DELETE cascade` para limpieza automática
- Integridad referencial garantizada

### Paso 4: Índices de Rendimiento
- **17 índices** para optimizar queries
- Índice GIN para búsqueda fuzzy de jugadores
- Índices compuestos para queries complejas
- Índice parcial para matches activos

### Paso 5: Row Level Security (RLS)
- **users**: Solo ves tu propio perfil
- **player_ratings**: Todos pueden ver, solo backend modifica
- Sin RLS en tablas de juego (acceso via backend con service_role)

### Paso 6: Triggers
- `updated_at` se actualiza automáticamente en `users` y `player_ratings`

---

## 🐛 Troubleshooting

### Error: "relation already exists"
**Solución:** Las tablas ya existen. El script tiene `IF NOT EXISTS`, así que es seguro. Ignora el warning.

### Error: "permission denied"
**Solución:** Asegúrate de estar ejecutando el script en el SQL Editor con permisos de administrador (deberías tenerlos por defecto).

### Error: "extension already exists"
**Solución:** Las extensiones ya están habilitadas. Es seguro ignorar.

### No veo las tablas en Table Editor
**Solución:** 
1. Refresca la página (F5)
2. Verifica que el script se ejecutó sin errores rojos
3. Verifica que estás en el schema `public`

---

## 🎯 Próximo Paso Después de Ejecutar

Una vez que las tablas estén creadas, ejecuta:

```bash
bun run db:studio
```

Esto abre **Drizzle Studio** en tu navegador para explorar visualmente la base de datos.

---

## 📞 ¿Necesitas Ayuda?

Si algo no funciona:
1. Copia el mensaje de error exacto
2. Verifica que el script se copió completo (debe tener ~400+ líneas)
3. Intenta ejecutarlo por partes si es necesario

---

## ✅ Cuando Termine

Avísame y continuamos con:
- **FASE 3:** ETL del dataset de Kaggle (cargar jugadores reales)
- **FASE 4:** API backend (Hono + Bun)
- **FASE 5:** PartyKit real-time
