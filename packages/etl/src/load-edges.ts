import { parse } from 'csv-parse/sync';
import { db, teammateEdges, players } from '@football-connections/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { eq } from 'drizzle-orm';

interface TeammateCSVRow {
  player_id: string;
  player_with_url?: string;
  player_with_name: string;
  player_with_id?: string; // Puede venir directamente
  ppg_played_with?: string;
  joint_goal_participation?: string;
  minutes_played_with: string;
}

// Configuración de calidad
const MIN_MINUTES = 90; // Mínimo 90 minutos juntos para modo ranked
const MAX_EDGES_PER_PLAYER = 500; // Limitar para jugadores muy populares

async function loadTeammateEdges() {
  console.log('🔗 Iniciando carga de relaciones de compañeros...\n');

  try {
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

    // 4. Resolver teammate_id si solo viene el nombre
    console.log('🔍 Resolviendo IDs de compañeros...');
    const edgeData = [];
    let resolved = 0;
    let skipped = 0;

    for (const row of filteredRecords) {
      const playerId = parseInt(row.player_id);
      
      // Intentar obtener teammate_id
      let teammateId: number | null = null;
      
      if (row.player_with_id) {
        teammateId = parseInt(row.player_with_id);
      } else if (row.player_with_url) {
        // Extraer ID de la URL (ej: /player/123456/name)
        const match = row.player_with_url.match(/\/player\/(\d+)/);
        if (match) {
          teammateId = parseInt(match[1]);
        }
      }

      if (!teammateId || isNaN(playerId) || isNaN(teammateId)) {
        skipped++;
        continue;
      }

      const minutes = parseInt(row.minutes_played_with || '0');
      const goals = parseInt(row.joint_goal_participation || '0');
      const weightScore = minutes + (goals * 100); // Dar más peso a participación en goles

      edgeData.push({
        playerId,
        teammateId,
        minutesPlayedWith: minutes,
        jointGoalParticipation: goals,
        ppgPlayedWith: row.ppg_played_with || null,
        weightScore,
      });

      resolved++;
      if (resolved % 10000 === 0) {
        console.log(`  📊 Progreso: ${resolved}/${filteredRecords.length}`);
      }
    }

    console.log(`✅ ${resolved} relaciones resueltas, ${skipped} omitidas\n`);

    // 5. Crear edges bidireccionales (opcional pero recomendado)
    console.log('🔄 Creando edges bidireccionales...');
    const bidirectionalEdges = [...edgeData];
    
    for (const edge of edgeData) {
      // Agregar el edge inverso si no existe ya
      const reverseExists = edgeData.some(
        (e) => e.playerId === edge.teammateId && e.teammateId === edge.playerId
      );
      
      if (!reverseExists) {
        bidirectionalEdges.push({
          playerId: edge.teammateId,
          teammateId: edge.playerId,
          minutesPlayedWith: edge.minutesPlayedWith,
          jointGoalParticipation: edge.jointGoalParticipation,
          ppgPlayedWith: edge.ppgPlayedWith,
          weightScore: edge.weightScore,
        });
      }
    }

    console.log(`✅ ${bidirectionalEdges.length} edges totales (bidireccionales)\n`);

    // 6. Insertar en BD en lotes
    console.log('💾 Insertando en base de datos...');
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < bidirectionalEdges.length; i += BATCH_SIZE) {
      const batch = bidirectionalEdges.slice(i, i + BATCH_SIZE);
      
      await db.insert(teammateEdges)
        .values(batch)
        .onConflictDoNothing(); // Skip duplicates
      
      inserted += batch.length;
      console.log(`  📊 Progreso: ${inserted}/${bidirectionalEdges.length} (${Math.round(inserted/bidirectionalEdges.length*100)}%)`);
    }

    console.log(`\n✅ ¡Carga completada!`);
    console.log(`   - Total registros CSV: ${records.length}`);
    console.log(`   - Filtrados por calidad: ${filteredRecords.length}`);
    console.log(`   - Edges insertados: ${inserted}`);
    console.log(`   - Tiempo: ${process.uptime().toFixed(2)}s\n`);

  } catch (error) {
    console.error('❌ Error durante la carga:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar
loadTeammateEdges();
