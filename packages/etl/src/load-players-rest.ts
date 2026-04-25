import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PlayerCSVRow {
  player_id: string;
  player_name: string;
  player_slug?: string;
}

// Configurar cliente Supabase con API REST (evita problemas de DNS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function loadPlayers() {
  console.log('🏃 Iniciando carga de jugadores...\n');

  try {
    // 1. Leer CSV
    const csvPath = join(__dirname, '../data/player_profiles.csv');
    console.log(`📂 Leyendo archivo: ${csvPath}`);
    
    const fileContent = readFileSync(csvPath, 'utf-8');
    
    // 2. Parsear CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as PlayerCSVRow[];

    console.log(`✅ ${records.length} registros leídos del CSV\n`);

    // 3. Normalizar datos
    console.log('🔄 Normalizando datos...');
    const playerData = records.map((row) => {
      const normalizedName = row.player_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .trim();

      return {
        id: parseInt(row.player_id),
        name: row.player_name,
        slug: row.player_slug || null,
        normalized_name: normalizedName,
        is_active: true,
      };
    }).filter((player) => !isNaN(player.id)); // Filter invalid IDs

    console.log(`✅ ${playerData.length} jugadores normalizados\n`);

    // 4. Insertar en BD en lotes usando Supabase REST API
    console.log('💾 Insertando en base de datos via Supabase REST API...');
    const BATCH_SIZE = 500; // Supabase REST API tiene límites más bajos que PostgreSQL directo
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < playerData.length; i += BATCH_SIZE) {
      const batch = playerData.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('players')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
      
      if (error) {
        console.error(`  ❌ Error en lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
        errors++;
      } else {
        inserted += batch.length;
      }
      
      console.log(`  📊 Progreso: ${inserted}/${playerData.length} (${Math.round(inserted/playerData.length*100)}%)`);
      
      // Pequeña pausa para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ ¡Carga completada!`);
    console.log(`   - Total registros CSV: ${records.length}`);
    console.log(`   - Jugadores insertados: ${inserted}`);
    console.log(`   - Errores: ${errors}`);
    console.log(`   - Tiempo: ${process.uptime().toFixed(2)}s\n`);

    if (errors > 0) {
      console.log('⚠️  Algunos lotes tuvieron errores. Revisa los logs arriba.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error durante la carga:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar
loadPlayers();
