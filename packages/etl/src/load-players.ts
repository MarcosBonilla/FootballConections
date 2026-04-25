import { parse } from 'csv-parse/sync';
import { db, players } from '@football-connections/database';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PlayerCSVRow {
  player_id: string;
  player_name: string;
  player_slug?: string;
  // Agregar más campos según el CSV real
}

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
        normalizedName,
        isActive: true,
      };
    }).filter((player) => !isNaN(player.id)); // Filter invalid IDs

    console.log(`✅ ${playerData.length} jugadores normalizados\n`);

    // 4. Insertar en BD en lotes
    console.log('💾 Insertando en base de datos...');
    const BATCH_SIZE = 1000;
    let inserted = 0;

    for (let i = 0; i < playerData.length; i += BATCH_SIZE) {
      const batch = playerData.slice(i, i + BATCH_SIZE);
      
      await db.insert(players)
        .values(batch)
        .onConflictDoNothing(); // Skip duplicates
      
      inserted += batch.length;
      console.log(`  📊 Progreso: ${inserted}/${playerData.length} (${Math.round(inserted/playerData.length*100)}%)`);
    }

    console.log(`\n✅ ¡Carga completada!`);
    console.log(`   - Total registros CSV: ${records.length}`);
    console.log(`   - Jugadores insertados: ${inserted}`);
    console.log(`   - Tiempo: ${process.uptime().toFixed(2)}s\n`);

  } catch (error) {
    console.error('❌ Error durante la carga:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar
loadPlayers();
