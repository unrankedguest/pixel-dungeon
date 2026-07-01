const fs = require('fs');
const vm = require('vm');
const path = require('path');

const targetFilePath = path.join(__dirname, 'index.html');

console.log("=== Build Checker: 1. Checking Syntax ===");
try {
    const html = fs.readFileSync(targetFilePath, 'utf8');
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let index = 1;
    while ((match = scriptRegex.exec(html)) !== null) {
        const jsCode = match[1];
        if (jsCode.trim().length === 0) continue;
        console.log(`Parsing script block #${index}...`);
        new vm.Script(jsCode);
        index++;
    }
    console.log("SUCCESS: Syntax check passed!");
} catch (e) {
    console.error("SYNTAX ERROR DETECTED:", e);
    process.exit(1);
}

console.log("\n=== Build Checker: 2. Mocking DOM & Running Script ===");
const ctxMock = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    arcTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 50 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
    rect: () => {},
    clip: () => {},
};

const canvasMock = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 480 }),
    addEventListener: () => {},
    width: 960,
    height: 480,
    getContext: () => ctxMock,
};

const windowMock = {
    addEventListener: () => {},
    removeEventListener: () => {},
    webkitAudioContext: function() {},
    AudioContext: function() {},
    devicePixelRatio: 1,
};

const documentMock = {
    getElementById: (id) => {
        if (id === 'gameCanvas') return canvasMock;
        return {
            classList: { remove: () => {}, add: () => {} },
            style: { display: 'none' },
            addEventListener: () => {},
            value: '',
            innerText: '',
        };
    },
    querySelectorAll: (selector) => {
        return [{
            addEventListener: () => {},
            value: 'public',
            checked: true
        }];
    },
    querySelector: (selector) => {
        return {
            value: 'public'
        };
    },
    addEventListener: () => {},
    createElement: () => ({}),
};

const sandbox = {
    window: windowMock,
    document: documentMock,
    canvas: canvasMock,
    ctx: ctxMock,
    AudioContext: windowMock.AudioContext,
    requestAnimationFrame: () => {},
    console: console,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Math: Math,
    Date: Date,
    JSON: JSON,
    WebSocket: function() {},
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    AbortController: global.AbortController || function() { this.signal = {}; this.abort = () => {}; }
};

vm.createContext(sandbox);

try {
    const html = fs.readFileSync(targetFilePath, 'utf8');
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let jsCode = "";
    while ((match = scriptRegex.exec(html)) !== null) {
        jsCode += match[1] + "\n";
    }

    console.log("Initializing in mock sandbox...");
    vm.runInContext(jsCode, sandbox);
    console.log("SUCCESS: Initialization runtime check passed!");
    process.exit(0);
} catch (e) {
    console.error("RUNTIME RUN EXCEPTION DETECTED:", e);
    process.exit(1);
}
