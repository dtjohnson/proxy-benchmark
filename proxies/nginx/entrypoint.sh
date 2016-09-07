#!/usr/bin/env bash

: "${UPSTREAM_HOST:?You must set the UPSTREAM_HOST environmental variable}"
: "${UPSTREAM_PORT:?You must set the UPSTREAM_PORT environmental variable}"

envsubst < /nginx.conf.template > /etc/nginx/nginx.conf

nginx -g 'daemon off;'
