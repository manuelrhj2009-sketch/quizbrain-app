# Usa una imagen oficial de Node con Bun (ya que tu proyecto usa bun.lock)
FROM oven/bun:1 as base
WORKDIR /app

# Copia los archivos de configuración e instala dependencias
COPY package.json bun.lock ./
RUN bun install

# Copia todo el código fuente
COPY . .

# Compila el frontend si es necesario y expone el puerto
ENV PORT=10000
EXPOSE 10000

# Comando para arrancar el servidor de WebSockets y Express
CMD ["bun", "run", "server.ts"]
