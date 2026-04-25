# 🗄️ Setup de Base de Datos - FASE 2

## ✅ Lo que ya está configurado

- ✅ Schemas de Drizzle creados (players, users, matches, ratings)
- ✅ Configuración de Drizzle Kit
- ✅ Archivos de conexión a Supabase (cliente y servidor)
- ✅ Scripts SQL de extensiones PostgreSQL
- ✅ Variables de entorno parcialmente configuradas

---

## 🔐 Paso 1: Completar tu contraseña de BD

**IMPORTANTE:** Necesitas agregar tu contraseña de Supabase al archivo `.env`

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Settings > Database > Database Settings
3. Copia tu contraseña (o resetéala si no la recuerdas)
4. Edita el archivo `.env` en la raíz del proyecto
5. Reemplaza `[TU-CONTRASEÑA]` en la línea de `DATABASE_URL`:

```bash
# ANTES
DATABASE_URL=postgresql://postgres:[TU-CONTRASEÑA]@db.aproqvilojuhqjickjfr.supabase.co:5432/postgres

# DESPUÉS (ejemplo con contraseña "mySecurePass123")
DATABASE_URL=postgresql://postgres:mySecurePass123@db.aproqvilojuhqjickjfr.supabase.co:5432/postgres
```

---

## 📊 Paso 2: Ejecutar SQL de Extensiones

**En el SQL Editor de Supabase:**

1. Ve a https://supabase.com/dashboard → Tu Proyecto → SQL Editor
2. Click en "New query"
3. Copia el contenido de `scripts/setup-postgres-extensions.sql`
4. Pégalo en el editor
5. Click en "Run" (o F5)

Este script habilita:
- ✅ `pg_trgm` - Búsqueda fuzzy de jugadores
- ✅ `uuid-ossp` - Generación de UUIDs
- ✅ `pgcrypto` - Funciones de cifrado
- ✅ Políticas RLS en `users` y `player_ratings`
- ✅ Índices de rendimiento
- ✅ Triggers para `updated_at`

**Verificación:** Deberías ver mensaje "Success. No rows returned"

---

## 🚀 Paso 3: Generar y Aplicar Migraciones

**Desde la raíz del proyecto:**

```bash
# 1. Generar migraciones desde los schemas
bun run db:generate

# 2. Ver las migraciones generadas (opcional)
ls packages/database/drizzle/

# 3. Aplicar migraciones a Supabase
bun run db:push
```

**Qué hace `db:push`:**
- Lee tus schemas TypeScript
- Los compara con tu BD en Supabase
- Crea las tablas, columnas, índices y constraints
- Todo en una transacción segura

**Verificación:** Deberías ver en Supabase Table Editor:
- ✅ `users`
- ✅ `players`
- ✅ `teammate_edges`
- ✅ `matches`
- ✅ `match_turns`
- ✅ `match_chain_nodes`
- ✅ `player_ratings`
- ✅ `rating_history`

---

## 🧪 Paso 4 (Opcional): Seed de Datos de Prueba

**Si quieres datos de prueba para desarrollo:**

1. En Supabase SQL Editor
2. Ejecuta el script `scripts/seed-dev-data.sql`
3. Esto crea:
   - 2 usuarios de prueba
   - 5 jugadores famosos (Messi, Ronaldo, Neymar, Mbappé, Ramos)
   - Relaciones de compañeros entre ellos

**⚠️ Nota:** Estos son datos ficticios. Para el juego real necesitarás el dataset completo de Kaggle (Fase siguiente).

---

## 🔍 Paso 5: Verificar que Todo Funciona

```bash
# Abrir Drizzle Studio para explorar visualmente
bun run db:studio
```

Esto abre una UI web en `https://local.drizzle.studio` donde puedes:
- Ver todas las tablas
- Inspeccionar el schema
- Insertar/editar datos manualmente
- Ejecutar queries

---

## ❓ Troubleshooting

### Error: "password authentication failed"
- ✅ Verifica que la contraseña en `.env` sea correcta
- ✅ Asegúrate de no tener espacios extras
- ✅ Prueba resetear la contraseña en Supabase

### Error: "relation does not exist"
- ✅ Ejecuta primero `bun run db:push`
- ✅ Verifica que las tablas aparezcan en Supabase Table Editor

### Error: "extension pg_trgm does not exist"
- ✅ Ejecuta el script `setup-postgres-extensions.sql` en SQL Editor
- ✅ Refréscala página y verifica que las extensiones estén habilitadas

### Error: "DATABASE_URL is not set"
- ✅ Asegúrate de tener el archivo `.env` en la raíz
- ✅ Verifica que no se llame `.env.example`
- ✅ Reinicia tu terminal después de crear el `.env`

---

## ✅ Checklist Final

- [ ] Contraseña agregada al `.env`
- [ ] Script de extensiones ejecutado en Supabase
- [ ] `bun run db:generate` ejecutado sin errores
- [ ] `bun run db:push` ejecutado sin errores
- [ ] Tablas visibles en Supabase Table Editor
- [ ] (Opcional) Seed de datos de prueba ejecutado
- [ ] Drizzle Studio abre correctamente

**Cuando todos estén ✅ → FASE 2 COMPLETADA** 🎉

---

## 📝 Próximos Pasos

**FASE 3:** Configurar ETL del dataset de Kaggle para cargar jugadores y relaciones reales.

**FASE 4:** Implementar API backend (Hono + Bun) con endpoints de matchmaking y validación.

**FASE 5:** Configurar PartyKit para real-time WebSocket.

**FASE 6:** Implementar frontend Next.js con componentes del juego.
