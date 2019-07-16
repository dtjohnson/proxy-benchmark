#!/usr/bin/env bash

: "${UPSTREAM_HOST:?You must set the UPSTREAM_HOST environmental variable}"
: "${UPSTREAM_PORT:?You must set the UPSTREAM_PORT environmental variable}"

envsubst < /000-default.conf.template > /etc/apache2/sites-available/000-default.conf

echo Starting Apache...
/usr/sbin/apache2ctl -D FOREGROUND
