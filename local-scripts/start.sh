#!/usr/bin/env bash
set -e
DIR=`dirname $0`

IMAGE=proxy-benchmark:$1
CONTAINER=proxy-benchmark-$1

if [ "$1" == "upstream" ]; then
    DOCKERFILE=$DIR/../upstream
    PORT=80
else
    if [ -z "$2" ]; then
        echo You must specify a port!
        exit 1
    fi

    DOCKERFILE=$DIR/../proxies/$1
    PORT=$2
fi

docker build -t $IMAGE $DOCKERFILE

docker rm -f $CONTAINER || true
docker run -d --name $CONTAINER -p $PORT:80 -e UPSTREAM_HOST=192.168.99.100 -e UPSTREAM_PORT=80 $IMAGE

echo
echo $CONTAINER running on port $PORT
