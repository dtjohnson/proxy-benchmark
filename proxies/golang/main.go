package main

import (
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
)

// https://github.com/golang/go/issues/14975
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

func (w gzipResponseWriter) WriteHeader(code int) {
	w.Header().Set("Content-Encoding", "gzip")
	w.Header().Del("Content-Length")
	w.ResponseWriter.WriteHeader(code)
}

func main() {
	host := os.Getenv("UPSTREAM_HOST") + ":" + os.Getenv("UPSTREAM_PORT")
	proxy := httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = host
		},
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			proxy.ServeHTTP(w, r)
			return
		}

		gz := gzip.NewWriter(w)
		defer func() {
			err := gz.Close()
			if err != nil {
				fmt.Printf("Error closing gzip: %+v\n", err)
			}
		}()

		gzr := gzipResponseWriter{
			Writer:         gz,
			ResponseWriter: w,
		}

		proxy.ServeHTTP(gzr, r)
	})

	fmt.Println("Proxying traffic to", host)

	go http.ListenAndServe(":80", nil)
	http.ListenAndServeTLS(":443", "cert.pem", "key.pem", nil)
}
