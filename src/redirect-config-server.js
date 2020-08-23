#!/usr/bin/node

const LISTEN_SOCKET = process.env.LISTEN_SOCKET;
const PREFIX_DIR = process.env.PREFIX_DIR;
const TRAILING_SLASH_OPTIONAL = ['true', 't', 'yes', 'y'].includes((process.env.TRAILING_SLASH_OPTIONAL || 'false').toLowerCase());

if (!LISTEN_SOCKET) {
    console.error('export LISTEN_SOCKET=/tmp/my_redirects.sock');
    process.exit(1);
}
if (!PREFIX_DIR) {
    console.error('export PREFIX_DIR=/');
    process.exit(1);
}

const LOCAL_PREFIX_DIR = PREFIX_DIR.replace(/\/$/, '');



const express = require('express');
const fs = require('fs');

const cwd = process.cwd();
const _redirects = cwd + '/_redirects';

// { sourcePath : { destPath : redirectCode }
let rules = {};

const app = express()

let fsWatcher;

function updateRedirects() {
    fs.readFile(_redirects, 'utf8', (err, data) => {
        if (err) {
            console.error('Unable to update redirects', err);
            return;
        }
        const dataLines = data
            .split(/\n/)
            .map(line => {
                const commentStart = line.indexOf('#');
                return line.substring(0, commentStart === -1 ? line.length : commentStart).trim();
            })
            .filter(line => line);
        rules = dataLines
            .map(line => line.split(/\s+/))
            .reduce((acc, item) => {
                // defaults to 301:
                // /foo /bar
                // /foo /bar 301
                // /foo /bar 302
                const code = item[2] ? parseInt(item[2], 10) : 301;
                const rule = [
                    code,
                    LOCAL_PREFIX_DIR + item[1],
                ];
                acc[LOCAL_PREFIX_DIR + item[0]] = rule;
                const ruleHasNoTrailingSlash = item[0].charAt(item[0].length - 1) !== '/';
                if (TRAILING_SLASH_OPTIONAL && ruleHasNoTrailingSlash) {
                    acc[LOCAL_PREFIX_DIR + item[0] + '/'] = rule;
                }
                return acc;
            }, {});

    })
}

function handleFsWatchEvent(eventType, filename) {
    if (!filename) {
        return;
    }

    if (eventType === 'rename') {
        updateRedirects();
        watchRedirects();
        return;
    }

    if (eventType === 'change') {
        updateRedirects();
        return;
    }

    console.error('Unknown eventType', eventType, filename);
}

function watchRedirects() {
    if (fsWatcher) {
        fsWatcher.close();
    }
    fsWatcher = fs.watch(_redirects, handleFsWatchEvent);
}


app.get('*', (req, res) => {
    const rule = rules[req.path];
    if (!rule) {
        return res.status(404).sendFile(cwd + '/404.html');
    }
    // return res.status(rule[0]).location(rule[1]).send();
    return res.redirect(...rule);
});

updateRedirects();
watchRedirects();

app.listen(LISTEN_SOCKET, () => {
    console.log('Listening on ' + LISTEN_SOCKET);
});
