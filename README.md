# redirect-config-server

Self-hosted netlify redirects config. Pairs well with the nginx / caddy try_files directive for static sites.

Usage:

```sh
export LISTEN_SOCKET=/tmp/redirects.sock
# or:
export LISTEN_SOCKET=8001

export WEB_ROOT_PATH=/
# or:
export WEB_ROOT_PATH=/next/

export TRAILING_SLASH_OPTIONAL=true
# or:
export TRAILING_SLASH_OPTIONAL=false

node redirect-config-server.js
```

Behavior:

* redirect-config-server will read the `_redirects` file in the current working directory, and watch the file for updates.
* The `_redirects` file format is a simple version of the netlify `_redirects` file format.  
  Lines are like:
  ```
  /source /destination 301
  ```
  where
    * `/source` is the source path,
    * `/destination` is the destination path, and
    * `301` is the HTTP response status code.  
      If the HTTP response status code is omitted, it defaults to 301.
    * any amount of whitespace can separate the fields.
* If a redirect is not found, then `404.html` in the current working directory is sent.

Configuration:

* `LISTEN_SOCKET`: listen socket
* `WEB_ROOT_PATH`: the directory in the web root that this redirect server works on
* `TRAILING_SLASH_OPTIONAL`: if a redirect source does not end with a `/`, then also redirect the source with a trailing `/`


TODO: rewrite in some compiled language
