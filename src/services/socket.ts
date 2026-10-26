import { io, Socket } from 'socket.io-client';

let sharedSocket: Socket | null = null;
let playerSocket: Socket | null = null;

const socketOptions = {
  transports: ['polling', 'websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
};

/**
 * Retorna la conexión de socket para los alumnos/móviles.
 * Utiliza io() sin especificar protocolo ni puerto para heredar
 * automáticamente el dominio HTTPS público actual de la aplicación (*.idx.app / *.run.app).
 */
export function getPlayerSocket(): Socket {
  if (!playerSocket) {
    playerSocket = io(socketOptions);
  }
  return playerSocket;
}

/**
 * Crea un socket independiente para simulación móvil en desarrollo.
 */
export function createPlayerSocket(): Socket {
  return io({
    ...socketOptions,
    forceNew: true
  });
}

/**
 * Socket principal para el proyector y panel de administración.
 * Hereda el dominio actual sin URLs fijas ni puertos locales.
 */
export function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(socketOptions);
  }
  return sharedSocket;
}

export function disconnectSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  if (playerSocket) {
    playerSocket.disconnect();
    playerSocket = null;
  }
}
