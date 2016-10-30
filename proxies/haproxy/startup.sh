#!/usr/bin/env bash

: "${UPSTREAM_HOST:?You must set the UPSTREAM_HOST environmental variable}"
: "${UPSTREAM_PORT:?You must set the UPSTREAM_PORT environmental variable}"

envsubst < /haproxy.cfg.template > /usr/local/etc/haproxy/haproxy.cfg

echo Starting HAProxy...
haproxy -f /usr/local/etc/haproxy/haproxy.cfg
