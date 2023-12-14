import {SourcePosition} from "./token";

export class RuntimeError extends Error {
    constructor(
        public sourcePos: SourcePosition,
        public tokenI: number,
        message: string,
    ) {
        super(message);
    }
}
export class RuntimeSyntaxError extends RuntimeError {}
export class RuntimeMathError extends RuntimeError {}
export class RuntimeStackError extends RuntimeError {}
export class RuntimeArgumentError extends RuntimeError {}
export class RuntimeGotoError extends RuntimeError {}

