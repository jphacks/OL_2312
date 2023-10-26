# 最新のLTS版(18)をinstall 
FROM node:lts
WORKDIR /usr/src/app
# アプリケーションの依存関係をインストール
# package.json: node.js周りの依存関係が記述されている
COPY package*.json ./
RUN npm install
# アプリケーションのソースをバンドル
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]