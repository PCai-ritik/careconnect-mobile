// polyfill.ts
if (typeof global.DOMException === 'undefined') {
    global.DOMException = class DOMException extends Error {
        constructor(message?: string, name?: string) {
            super(message);
            this.name = name ?? 'DOMException';
        }
    } as any;
}