FROM nginx

COPY nginx.conf.template /
COPY startup.sh /

RUN chmod +x /startup.sh

CMD ["/startup.sh"]

EXPOSE 80
