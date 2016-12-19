#!/usr/bin/env bash
set -e
DIR=`dirname $0`

IMAGE=proxy-benchmark:wrk
DOCKERFILE=$DIR/../wrk

docker build -t $IMAGE $DOCKERFILE

echo
docker run --rm $IMAGE wrk "$@"
