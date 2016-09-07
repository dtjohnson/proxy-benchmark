FROM haproxy

# Install gettext for envsubst
RUN apt-get update && apt-get install -y \
    gettext

COPY ./haproxy.cfg.template /
COPY ./startup.sh /

RUN chmod +x /startup.sh

ENTRYPOINT ["/startup.sh"]

EXPOSE 8080
