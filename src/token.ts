import {TokenType} from "./token-types";

export class SourcePosition {
    constructor(
        public index: number,
        public line: number,
        public column: number,
    ) {}
}

export class Token {
    get source() {
        return this.type.source;
    }
    get shown() {
        return this.type.shown;
    }

    constructor(
        public type: TokenType,
        public sourceStart: SourcePosition,
        public sourceEnd: SourcePosition,
    ) {}
}

export class TokenIterator {
    constructor(
        public tokens: Token[],
        public i = 0,
    ) {}

    cur(): Token | undefined { return this.tokens[this.i]; }
    last(): Token | undefined { return this.tokens.at(-1); }
    next(): void { ++this.i; }
    prev(): void { --this.i; }
    isInBound(): boolean { return this.i >= 0 && this.i < this.tokens.length; }
}

