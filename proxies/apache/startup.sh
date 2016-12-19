#!/usr/bin/env bash

: "${UPSTREAM_HOST:?You must set the UPSTREAM_HOST environmental variable}"
: "${UPSTREAM_PORT:?You must set the UPSTREAM_PORT environmental variable}"
: "${UPSTREAM_KEEP_ALIVE:?You must set the UPSTREAM_KEEP_ALIVE environmental variable}"

if [ "$UPSTREAM_KEEP_ALIVE" != "true" ]
then
    export SET_NO_KEEP_ALIVE='SetEnv proxy-nokeepalive 1'
fi

envsubst < /000-default.conf.template > /etc/apache2/sites-available/000-default.conf

echo Starting Apache...
/usr/sbin/apache2ctl -D FOREGROUND
