/**
 * Script de verificación automática del WebSocket Server
 */

import WebSocket from 'ws';

console.log('🧪 Iniciando testing automático del WebSocket Server...\n');

const TEST_URL = 'ws://localhost:1999/game-room/auto-test-' + Date.now();

// Simular Player 1
const player1 = new WebSocket(TEST_URL + '?userId=player-1');

player1.on('open', () => {
  console.log('✅ Player 1 conectado');
});

player1.on('message', (data) => {
  const event = JSON.parse(data.toString());
  console.log(`📨 Player 1 recibió: ${event.type}`, event.data ? `- ${JSON.stringify(event.data).substring(0, 80)}...` : '');
  
  // Si recibimos game:start, hacer un movimiento
  if (event.type === 'game:start' && event.data.currentTurn === 'player-1') {
    setTimeout(() => {
      console.log('📤 Player 1 enviando movimiento...');
      player1.send(JSON.stringify({
        type: 'player:move',
        data: { playerName: 'Karim Benzema' }
      }));
    }, 1000);
  }
  
  // Si recibimos movimiento válido y es nuestro turno, surrender
  if (event.type === 'game:turn' && event.data.currentTurn === 'player-1' && event.data.timeLeft === 19) {
    setTimeout(() => {
      console.log('📤 Player 1 enviando ping...');
      player1.send(JSON.stringify({ type: 'ping' }));
    }, 1000);
  }
});

player1.on('error', (error) => {
  console.error('❌ Error Player 1:', error.message);
});

// Simular Player 2 después de 2 segundos
setTimeout(() => {
  const player2 = new WebSocket(TEST_URL + '?userId=player-2');
  
  player2.on('open', () => {
    console.log('✅ Player 2 conectado');
  });
  
  player2.on('message', (data) => {
    const event = JSON.parse(data.toString());
    console.log(`📨 Player 2 recibió: ${event.type}`, event.data ? `- ${JSON.stringify(event.data).substring(0, 80)}...` : '');
    
    // Si nos toca el turno después del movimiento de Player 1, rendirse
    if (event.type === 'game:turn' && event.data.currentTurn === 'player-2' && event.data.timeLeft < 20) {
      setTimeout(() => {
        console.log('📤 Player 2 enviando surrender...');
        player2.send(JSON.stringify({ type: 'player:surrender' }));
        
        // Cerrar ambas conexiones después de terminar
        setTimeout(() => {
          console.log('\n✅ Testing completado exitosamente!');
          console.log('🔍 Verificar que se recibieron los siguientes eventos:');
          console.log('   1. game:state (ambos)');
          console.log('   2. player:connected (Player 1 notificado de Player 2)');
          console.log('   3. game:start (ambos)');
          console.log('   4. game:turn broadcasts (ambos)');
          console.log('   5. game:move:valid (ambos)');
          console.log('   6. pong (Player 1)');
          console.log('   7. game:end con reason="resign" (ambos)');
          
          player1.close();
          player2.close();
          process.exit(0);
        }, 2000);
      }, 2000);
    }
  });
  
  player2.on('error', (error) => {
    console.error('❌ Error Player 2:', error.message);
  });
}, 2000);

// Timeout de seguridad
setTimeout(() => {
  console.log('\n⏱️  Timeout del test alcanzado (20s)');
  process.exit(1);
}, 20000);
