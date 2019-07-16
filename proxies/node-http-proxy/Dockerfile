FROM node

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY server/ /usr/src/app/server

CMD ["node", "server"]
EXPOSE 80 443
