import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface TeammateCSVRow {
  player_id: string;
  teammate_player_id: string; // Nombre real de la columna en el CSV
  teammate_player_name: string;
  ppg_played_with?: string;
  joint_goal_participation?: string;
  minutes_played_with: string;
}

// Configuración de calidad
const MIN_MINUTES = 90;

// Configurar cliente Supabase con API REST
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

async function loadTeammateEdges() {
  console.log('🔗 Iniciando carga de relaciones de compañeros...\n');

  try {
    // 0. Obtener todos los IDs de jugadores válidos desde la BD (paginado)
    console.log('🔍 Obteniendo IDs de jugadores válidos desde la BD...');
    const validPlayerIds = new Set<number>();
    let from = 0;
    const PAGE_SIZE = 1000;
    
    while (true) {
      const { data: playerIds, error: playerError, count } = await supabase
        .from('players')
        .select('id', { count: 'exact' })
        .range(from, from + PAGE_SIZE - 1);
      
      if (playerError) {
        console.error('❌ Error al obtener jugadores:', playerError);
        process.exit(1);
      }
      
      if (!playerIds || playerIds.length === 0) break;
      
      playerIds.forEach((p: any) => validPlayerIds.add(p.id));
      
      console.log(`  📊 Descargados: ${validPlayerIds.size}${count ? `/${count}` : ''} jugadores`);
      
      if (playerIds.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    
    console.log(`✅ ${validPlayerIds.size} jugadores válidos encontrados\n`);

    // 1. Leer CSV
    const csvPath = join(__dirname, '../data/player_teammates_played_with.csv');
    console.log(`📂 Leyendo archivo: ${csvPath}`);
    
    const fileContent = readFileSync(csvPath, 'utf-8');
    
    // 2. Parsear CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as TeammateCSVRow[];

    console.log(`✅ ${records.length} registros leídos del CSV\n`);

    // 3. Filtrar por calidad
    console.log('🔄 Filtrando por calidad...');
    const filteredRecords = records.filter((row) => {
      const minutes = parseInt(row.minutes_played_with || '0');
      return minutes >= MIN_MINUTES;
    });

    console.log(`✅ ${filteredRecords.length} relaciones cumplen criterio de calidad (>= ${MIN_MINUTES} min)\n`);

    // 4. Resolver teammate_id desde el CSV y validar contra BD
    console.log('🔍 Procesando y validando IDs de compañeros...');
    const edgeData = [];
    let resolved = 0;
    let skipped = 0;
    let invalidPlayerIds = 0;
    let invalidTeammateIds = 0;

    for (const row of filteredRecords) {
      const playerId = parseInt(row.player_id);
      const teammateId = parseInt(row.teammate_player_id);

      if (isNaN(playerId) || isNaN(teammateId)) {
        skipped++;
        continue;
      }

      // Validar que ambos IDs existan en la BD
      if (!validPlayerIds.has(playerId)) {
        invalidPlayerIds++;
        continue;
      }
      
      if (!validPlayerIds.has(teammateId)) {
        invalidTeammateIds++;
        continue;
      }

      const minutes = parseInt(row.minutes_played_with || '0');
      const goals = parseInt(row.joint_goal_participation || '0');
      const weightScore = minutes + (goals * 100);

      edgeData.push({
        player_id: playerId,
        teammate_id: teammateId,
        minutes_played_with: minutes,
        joint_goal_participation: goals,
        ppg_played_with: row.ppg_played_with || null,
        weight_score: weightScore,
      });

      resolved++;
      if (resolved % 10000 === 0) {
        console.log(`  📊 Progreso: ${resolved}/${filteredRecords.length}`);
      }
    }

    console.log(`✅ ${resolved} relaciones válidas`);
    console.log(`   - ${skipped} omitidas (IDs inválidos)`);
    console.log(`   - ${invalidPlayerIds} con player_id no encontrado`);
    console.log(`   - ${invalidTeammateIds} con teammate_id no encontrado\n`);

    // 5. Crear edges bidireccionales
    console.log('🔄 Creando edges bidireccionales...');
    const bidirectionalEdges = [...edgeData];
    
    for (const edge of edgeData) {
      const reverseExists = edgeData.some(
        (e) => e.player_id === edge.teammate_id && e.teammate_id === edge.player_id
      );
      
      if (!reverseExists) {
        bidirectionalEdges.push({
          player_id: edge.teammate_id,
          teammate_id: edge.player_id,
          minutes_played_with: edge.minutes_played_with,
          joint_goal_participation: edge.joint_goal_participation,
          ppg_played_with: edge.ppg_played_with,
          weight_score: edge.weight_score,
        });
      }
    }

    console.log(`✅ ${bidirectionalEdges.length} edges totales (bidireccionales)\n`);

    // 6. Insertar en BD en lotes usando Supabase REST API
    console.log('💾 Insertando en base de datos via Supabase REST API...');
    const BATCH_SIZE = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < bidirectionalEdges.length; i += BATCH_SIZE) {
      const batch = bidirectionalEdges.slice(i, i + BATCH_SIZE);
      
      // Usar insert() en lugar de upsert() ya que es la primera carga
      const { error } = await supabase
        .from('teammate_edges')
        .insert(batch);
      
      if (error) {
        console.error(`  ❌ Error en lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
        errors++;
      } else {
        inserted += batch.length;
      }
      
      console.log(`  📊 Progreso: ${inserted}/${bidirectionalEdges.length} (${Math.round(inserted/bidirectionalEdges.length*100)}%)`);
      
      // Pequeña pausa para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ ¡Carga completada!`);
    console.log(`   - Total registros CSV: ${records.length}`);
    console.log(`   - Filtrados por calidad: ${filteredRecords.length}`);
    console.log(`   - Edges insertados: ${inserted}`);
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
loadTeammateEdges();
