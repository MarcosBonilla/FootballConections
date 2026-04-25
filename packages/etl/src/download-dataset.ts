#!/usr/bin/env bun

/**
 * Script para asistir en la descarga del dataset desde Kaggle
 * 
 * NOTA: Este script NO descarga automáticamente porque Kaggle requiere autenticación.
 * 
 * Pasos manuales:
 * 1. Ve a https://www.kaggle.com/datasets/xfkzujqjvx97n/football-datasets
 * 2. Inicia sesión con tu cuenta de Kaggle
 * 3. Click en "Download" (arriba a la derecha)
 * 4. Extrae el ZIP descargado
 * 5. Coloca los archivos CSV en packages/etl/data/
 * 
 * Archivos requeridos:
 * - player_profiles.csv (o players.csv)
 * - player_teammates_played_with.csv
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const dataDir = join(__dirname, '../data');
const requiredFiles = [
  'player_profiles.csv',
  'player_teammates_played_with.csv'
];

console.log('📦 Football Connections - Dataset Download Assistant\n');

// 1. Verificar que exista la carpeta data/
if (!existsSync(dataDir)) {
  console.log('📁 Creando carpeta packages/etl/data/...');
  mkdirSync(dataDir, { recursive: true });
  console.log('✅ Carpeta creada\n');
} else {
  console.log('✅ Carpeta packages/etl/data/ existe\n');
}

// 2. Verificar si ya están los archivos
console.log('🔍 Verificando archivos...\n');
let allFilesExist = true;

for (const file of requiredFiles) {
  const filePath = join(dataDir, file);
  const exists = existsSync(filePath);
  
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  
  if (!exists) {
    allFilesExist = false;
  }
}

console.log('');

// 3. Instrucciones
if (!allFilesExist) {
  console.log('⚠️  Faltan archivos del dataset. Por favor descárgalos manualmente:\n');
  console.log('   1. Ve a: https://www.kaggle.com/datasets/xfkzujqjvx97n/football-datasets');
  console.log('   2. Inicia sesión con tu cuenta de Kaggle (o crea una gratis)');
  console.log('   3. Click en el botón "Download"');
  console.log('   4. Extrae el archivo ZIP descargado');
  console.log('   5. Busca los siguientes archivos CSV:');
  for (const file of requiredFiles) {
    console.log(`      - ${file}`);
  }
  console.log(`   6. Copia los archivos a: ${dataDir}\n`);
  console.log('   Una vez copiados, vuelve a ejecutar este script para verificar.\n');
  process.exit(1);
} else {
  console.log('✅ ¡Todos los archivos necesarios están presentes!\n');
  console.log('📊 Próximos pasos:\n');
  console.log('   1. Cargar jugadores:');
  console.log('      bun run etl:players\n');
  console.log('   2. Cargar relaciones de compañeros:');
  console.log('      bun run etl:edges\n');
  console.log('   Ver packages/etl/README.md para más detalles.\n');
  process.exit(0);
}
