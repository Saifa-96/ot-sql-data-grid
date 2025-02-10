"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var node_http_1 = require("node:http");
var node_url_1 = require("node:url");
var node_path_1 = require("node:path");
var app = (0, express_1.default)();
var server = (0, node_http_1.createServer)(app);
var __dirname = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
app.get('/', function (req, res) {
    res.sendFile((0, node_path_1.join)(__dirname, 'index.html'));
});
server.listen(3000, function () {
    console.log('server running at http://localhost:3000');
});
