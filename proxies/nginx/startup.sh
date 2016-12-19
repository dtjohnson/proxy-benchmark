#!/usr/bin/env bash

: "${UPSTREAM_HOST:?You must set the UPSTREAM_HOST environmental variable}"
: "${UPSTREAM_PORT:?You must set the UPSTREAM_PORT environmental variable}"
: "${UPSTREAM_KEEP_ALIVE:?You must set the UPSTREAM_KEEP_ALIVE environmental variable}"

if [ "$UPSTREAM_KEEP_ALIVE" == "true" ]
then
    export SET_CONNECTION_HEADER='proxy_set_header Connection "";'
fi

envsubst < /nginx.conf.template > /etc/nginx/nginx.conf

echo Starting Nginx...
nginx -g 'daemon off;'
