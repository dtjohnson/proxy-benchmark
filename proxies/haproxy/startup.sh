#!/usr/bin/env bash

: "${UPSTREAM_HOST:?You must set the UPSTREAM_HOST environmental variable}"
: "${UPSTREAM_PORT:?You must set the UPSTREAM_PORT environmental variable}"
: "${GZIP:?You must set the GZIP environmental variable}"

COMPRESSION=""
if [[ "$GZIP" == "on" ]]; then
    COMPRESSION="compression algo gzip"
fi

export COMPRESSION

envsubst < /haproxy.cfg.template > /usr/local/etc/haproxy/haproxy.cfg

echo Starting HAProxy...
haproxy -f /usr/local/etc/haproxy/haproxy.cfg
