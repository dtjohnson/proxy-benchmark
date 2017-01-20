FROM node

RUN apt-get update \
 && apt-get install -y \
    build-essential \
    libssl-dev \
    git \
 && git clone https://github.com/giltene/wrk2.git \
 && cd wrk2 \
 && make \
 && cp wrk /usr/local/bin \
 && mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY server/ /usr/src/app/server

CMD ["node", "server"]
EXPOSE 80
