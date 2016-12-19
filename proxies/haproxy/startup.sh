#!/usr/bin/env bash

: "${UPSTREAM_HOST:?You must set the UPSTREAM_HOST environmental variable}"
: "${UPSTREAM_PORT:?You must set the UPSTREAM_PORT environmental variable}"
: "${UPSTREAM_KEEP_ALIVE:?You must set the UPSTREAM_KEEP_ALIVE environmental variable}"

if [ "$UPSTREAM_KEEP_ALIVE" != "true" ]
then
    export OPTION_HTTP_SERVER_CLOSE='option http-server-close'
fi

envsubst < /haproxy.cfg.template > /usr/local/etc/haproxy/haproxy.cfg

echo Starting HAProxy...
haproxy -f /usr/local/etc/haproxy/haproxy.cfg
