FROM node:24-slim
RUN mkdir -p /usr/src/tequity/games
WORKDIR /usr/src/tequity/games
COPY . .
RUN npm install --production
RUN npm run build
EXPOSE 8080
ENV PROVIDER=slot-game-provider
ENV GAMES_PATH=lib/games/*/index.js
CMD ["node","node_modules/@slotify/gdk/lib/index.js"]
