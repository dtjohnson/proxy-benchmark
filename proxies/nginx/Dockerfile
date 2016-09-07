FROM nginx

COPY ./nginx.conf.template /
COPY ./entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 8080
