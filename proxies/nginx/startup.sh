#!/usr/bin/env bash

: "${UPSTREAM_HOST:?You must set the UPSTREAM_HOST environmental variable}"
: "${UPSTREAM_PORT:?You must set the UPSTREAM_PORT environmental variable}"
: "${GZIP:?You must set the GZIP environmental variable}"

envsubst < /nginx.conf.template > /etc/nginx/nginx.conf

echo Starting Nginx...
nginx -g 'daemon off;'
