FROM haproxy

# Install gettext for envsubst
RUN apt-get update && apt-get install -y \
    gettext

COPY haproxy.cfg.template /
COPY startup.sh /
COPY bundle.pem /etc/ssl/

RUN chmod +x /startup.sh

CMD ["/startup.sh"]

EXPOSE 80
