#!/usr/bin/node

const LISTEN_SOCKET = process.env.LISTEN_SOCKET;
const TRAILING_SLASH_OPTIONAL = ['true', 't', 'yes', 'y'].includes((process.env.TRAILING_SLASH_OPTIONAL || 'false').toLowerCase());

if (!LISTEN_SOCKET) {
    console.error('export LISTEN_SOCKET=/tmp/my_redirects.sock');
    process.exit(1);
}

const WEB_ROOT_PATH = (function() {
    if (!process.env.WEB_ROOT_PATH) {
        return '/';
    }
    return process.env.WEB_ROOT_PATH;
})();

const LOCAL_WEB_ROOT_PATH = WEB_ROOT_PATH.replace(/\/$/, '');



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
                if (item.length > 3) {
                    console.error('Incorrect line format. Ignoring line: ', item);
                    return acc;
                } else if (item.length < 2) {
                    console.error('Incorrect line format. Ignoring line: ', item);
                    return acc;
                }
                let code;
                try {
                    code = item[2] ? parseInt(item[2], 10) : 301;
                } catch(e) {
                    console.error('Unable to parse response code. Ignoring line: ', item);
                    return acc;
                }
                const rule = [
                    code,
                    LOCAL_WEB_ROOT_PATH + item[1],
                ];
                acc[LOCAL_WEB_ROOT_PATH + item[0]] = rule;
                const ruleHasNoTrailingSlash = item[0].charAt(item[0].length - 1) !== '/';
                if (TRAILING_SLASH_OPTIONAL && ruleHasNoTrailingSlash) {
                    acc[LOCAL_WEB_ROOT_PATH + item[0] + '/'] = rule;
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
    if (!rule || req.path === LOCAL_WEB_ROOT_PATH + '/404.html') {
        return res.status(404).sendFile(cwd + '/404.html');
    }
    // return res.status(rule[0]).location(rule[1]).send();
    return res.redirect(...rule);
});

updateRedirects();
watchRedirects();

function startListen() {
    return app.listen(LISTEN_SOCKET, () => {
        console.log('Listening on ' + LISTEN_SOCKET);
    });
}

const server = startListen();

process.on('SIGINT', () => {
    server.close();
    process.exit();
});


