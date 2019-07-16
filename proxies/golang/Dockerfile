FROM golang

WORKDIR /go/src/app

COPY cert.pem key.pem main.go ./

RUN go get -d -v ./...
RUN go install -v ./...

CMD ["app"]

EXPOSE 80 443
