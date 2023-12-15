import {interpret, InterpreterDisplayEvent, InterpreterEvent, InterpreterPromptEvent} from "../interpreter";
import {lexicalize} from "../lexer";
import {RuntimeError, RuntimeSyntaxError, RuntimeMathError, RuntimeArgumentError, RuntimeGotoError} from "../runtime-error";
import {Token} from "../token";
import { Context, Variables, VariableName } from "./../context";
import { test, TestCase, TestCases } from "./suite";

class EventMismatchError extends Error {}

class TestPromptEvent {
    constructor(
        public context: Context | null,
        public varName: VariableName | null,
        public answer: number,
    ) {}

    test(event: InterpreterEvent) {
        if (!(event instanceof InterpreterPromptEvent)) {
            throw new EventMismatchError(`Event mismatch: expected InterpreterPromptEvent, got ${event.constructor.name}`);
        }
        if (this.context !== null && !this.context.equals(event.context)) {
            throw new EventMismatchError(`Context mismatch: expected ${JSON.stringify(this.context)}, got ${JSON.stringify(event.context)}`);
        }
        if (this.varName !== null && this.varName !== event.varName) {
            throw new EventMismatchError(`Variable name mismatch: expected ${this.varName}, got ${event.varName}`);
        }
        event.response = { answer: this.answer };
    }
}
class TestDisplayEvent {
    tokens: Token[] | null;

    constructor(
        public context: Context | null = null,
        tokensString: string | null = null,
        public value: number | null = null,
        public isDisp: boolean | null = null,
    ) {
        if (tokensString === null) {
            this.tokens = null;
        } else {
            const { tokens, errorPosition } = lexicalize(tokensString);
            if (errorPosition.length > 0) {
                throw new Error(`Tokens string has a lexical error at ${errorPosition[0]}`);
            }
            this.tokens = tokens;
        }
    }

    test(event: InterpreterEvent) {
        if (!(event instanceof InterpreterDisplayEvent)) {
            throw new EventMismatchError(`Event mismatch: expected InterpreterDisplayEvent, got ${event.constructor.name}`);
        }
        if (this.context !== null && !this.context.equals(event.context)) {
            throw new EventMismatchError(`Context mismatch: expected ${JSON.stringify(this.context)}, got ${JSON.stringify(event.context)}`);
        }
        if (this.tokens !== null) {
            if (this.tokens.length !== event.tokens.length || !this.tokens.every((t, i) => t.type === event.tokens[i]!.type)) {
                throw new EventMismatchError(`Tokens mismatch: expected "${this.tokens.reduce((prev, cur) => prev + cur.shown, "")}", got "${event.tokens.reduce((prev, cur) => prev + cur.shown, "")}"`);
            }
        }
        if (this.value !== null && this.value !== event.value) {
            throw new EventMismatchError(`Value mismatch: expected ${this.value}, got ${event.value}`);
        }
        if (this.isDisp !== null && this.isDisp !== event.isDisp) {
            throw new EventMismatchError(`isDisp mismatch: expected ${this.isDisp}, got ${event.isDisp}`);
        }
    }
}
class TestRuntimeErrorEvent {
    constructor(
        public context: Context | null = null,
        public ErrorClass: typeof RuntimeError | null = null,
        public tokenI: number | null = null,
    ) {}

    test(context: Context, error: RuntimeError) {
        if (this.context !== null && !this.context.equals(context)) {
            throw new EventMismatchError(`Context mismatch: expected ${JSON.stringify(this.context)}, got ${JSON.stringify(context)}`);
        }
        if (this.ErrorClass !== null && !(error instanceof this.ErrorClass)) {
            throw new EventMismatchError(`Error type mismatch: expected ${this.ErrorClass}, got ${(error as RuntimeError).constructor.name}`);
        }
        if (this.tokenI !== null && this.tokenI !== error.tokenI) {
            throw new EventMismatchError(`Token index mismatch: expected ${this.tokenI}, got ${error.tokenI}`);
        }
    }
}
type TestEvent = TestPromptEvent | TestDisplayEvent | TestRuntimeErrorEvent;

function expectInterpret(input: string, context: Context, ioEvents: TestEvent[]): TestCase {
    return () => {
        const { tokens, errorPosition } = lexicalize(input);
        if (errorPosition.length > 0) {
            console.error(`Input string has a lexical error at ${errorPosition[0]}`);
            return false;
        }

        let ioEventI = 0;
        try {
            const interpreterGenerator = interpret(tokens, context);
            for (const testEvent of ioEvents) {
                const event = interpreterGenerator.next().value;

                if (testEvent instanceof TestPromptEvent || testEvent instanceof TestDisplayEvent) {
                    testEvent.test(event);
                } else if (testEvent instanceof TestRuntimeErrorEvent) {
                    throw new EventMismatchError(`Event mismatch: expected runtime error, got ${event.constructor.name}`);
                }

                ioEventI++;
            }
            return true;
        } catch (err: unknown) {
            if (err instanceof EventMismatchError) {
                console.error(`(During event ${ioEventI}) `, err.message);
                return false;
            } else if (err instanceof RuntimeError) {
                try {
                    const testEvent = ioEvents[ioEventI]!;
                    if (!(testEvent instanceof TestRuntimeErrorEvent)) throw new EventMismatchError(`Event mismatch: expected ${testEvent.constructor.name}, got ${err.constructor.name}`);
                    testEvent.test(context, err);
                    return true;
                } catch (err: unknown) {
                    if (err instanceof EventMismatchError) {
                        console.error(`(During event ${ioEventI}) `, err.message);
                        return false;
                    } else {
                        throw err;
                    }
                }
            } else {
                throw err;
            }
        }
        // async function prompt(context: Context, varName: VariableName): Promise<number> {
        //     const event = ioEvents[ioEventI];
        //     if (!(event instanceof PromptEvent)) throw new EventMismatchError(`Unexpected prompt event`);

        //     const returns = event.testAndReturn(context, varName);

        //     ioEventI++;
        //     if (ioEventI >= ioEvents.length) throw new InterpreterBreakError();

        //     return returns;
        // }
        // async function display(context: Context, tokens: Token[], value: number, isDisp: boolean) {
        //     if (ioEventI >= ioEvents.length) throw new InterpreterBreakError();
        //     const event = ioEvents[ioEventI];
        //     if (!(event instanceof DisplayEvent)) throw new EventMismatchError(`Unexpected display event`);

        //     event.test(context, tokens, value, isDisp);

        //     ioEventI++;
        //     if (ioEventI >= ioEvents.length) throw new InterpreterBreakError();
        // }

        // try {
        //     await interpret(tokens, context, { prompt, display });
        //     return true;
        // } catch (err: unknown) {
        //     if (err instanceof InterpreterBreakError) {
        //         return true;
        //     } else if (err instanceof EventMismatchError) {
        //         console.error(`(During event ${ioEventI}) `, err.message);
        //         return false;
        //     } else if (err instanceof RuntimeError) {
        //         try {
        //             const event = ioEvents[ioEventI];
        //             if (!(event instanceof RuntimeErrorEvent)) throw new EventMismatchError(`Unexpected runtime error event`);
        //             event.test(context, err);
        //             return true;
        //         } catch (err: unknown) {
        //             if (err instanceof EventMismatchError) {
        //                 console.error(`(During event ${ioEventI}) `, err.message);
        //                 return false;
        //             } else {
        //                 throw err;
        //             }
        //         }
        //     } else {
        //         throw err;
        //     }
        // }
    };
}

const interpreterTests: TestCases = {
    prompt: {
        functionality: [
            expectInterpret("? -> A", new Context(), [
                new TestPromptEvent(new Context(), "A", 42),
                new TestDisplayEvent(new Context({ variables: new Variables({ A: 42, Ans: 0 }) }), "? -> A", 42, false),
                new TestPromptEvent(new Context({ variables: new Variables({ A: 42, Ans: 0 }) }), "A", 69),
                new TestDisplayEvent(new Context({ variables: new Variables({ A: 69, Ans: 0 }) }), "? -> A", 69, false),
                new TestPromptEvent(new Context({ variables: new Variables({ A: 69, Ans: 0 }) }), "A", -4),
                new TestDisplayEvent(new Context({ variables: new Variables({ A: -4, Ans: 0 }) }), "? -> A", -4, false),
            ]),
            expectInterpret("? -> Ans", new Context(), [
                new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2),
            ]),
            expectInterpret("? -> B:", new Context(), [
                new TestPromptEvent(new Context(), "B", 1),
                new TestDisplayEvent(new Context({ variables: new Variables({ B: 1, Ans: 0 }) }), "? -> B", 1, false),
                new TestPromptEvent(new Context({ variables: new Variables({ B: 1, Ans: 0}) }), "B", 2),
                new TestDisplayEvent(new Context({ variables: new Variables({ B: 2, Ans: 0 }) }), "? -> B", 2, false),
            ]),
            expectInterpret("? -> C disp", new Context(), [
                new TestPromptEvent(new Context(), "C", 3),
                new TestDisplayEvent(new Context({ variables: new Variables({ C: 3, Ans: 0 }) }), "? -> C", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ C: 3, Ans: 0 }) }), "", 3, false),
                new TestPromptEvent(new Context({ variables: new Variables({ C: 3, Ans: 0 }) }), "C", 4),
                new TestDisplayEvent(new Context({ variables: new Variables({ C: 4, Ans: 0 }) }), "? -> C", 4, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ C: 4, Ans: 0 }) }), "", 4, false),
            ]),
            expectInterpret("? -> D: ? -> X disp ? -> Y", new Context(), [
                new TestPromptEvent(new Context(), "D", 5),
                new TestPromptEvent(new Context({ variables: new Variables({ D: 5, Ans: 0 }) }), "X", 6),
                new TestDisplayEvent(new Context({ variables: new Variables({ D: 5, X: 6, Ans: 0 }) }), "? -> X", 6, true),
                new TestPromptEvent(new Context({ variables: new Variables({ D: 5, X: 6, Ans: 0 }) }), "Y", 7),
                new TestDisplayEvent(new Context({ variables: new Variables({ D: 5, X: 6, Y: 7, Ans: 0 }) }), "? -> Y", 7, false),
                new TestPromptEvent(new Context({ variables: new Variables({ D: 5, X: 6, Y: 7, Ans: 0 }) }), "D", 8),
            ]),
        ],

        syntax: [
            expectInterpret("?", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 1) ]),
            expectInterpret("?A", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 1) ]),
            expectInterpret("??", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 1) ]),
            expectInterpret("? ->", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
            expectInterpret("? -> 6", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
            expectInterpret("? -> ->", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
            expectInterpret("? -> ?", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
            expectInterpret("? -> A ->", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 3) ]),
            expectInterpret("? -> Ans ->", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
        ],
    },

    expression: [
        expectInterpret("1+2", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
        ]),
        expectInterpret("1+2:", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
        ]),
        expectInterpret("1+2 disp", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, true),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, true),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "", 3, false),
        ]),
        expectInterpret("log(10", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, false),
        ]),
        expectInterpret("log(10:", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, false),
        ]),
        expectInterpret("log(10 disp", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, true),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "", 1, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, true),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "", 1, false),
        ]),
        expectInterpret("6: 1 div 0 disp", new Context(), [ new TestRuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 6 }) }), RuntimeMathError, 5) ]),
        expectInterpret("6: 1 div 0", new Context(), [ new TestRuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 6 }) }), RuntimeMathError, 5) ]),
        expectInterpret("Ans+3", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "Ans+3", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 6 }) }), "Ans+3", 6, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 9 }) }), "Ans+3", 9, false),
        ]),
        expectInterpret("5: ? -> A: Ans + A", new Context(), [
            new TestPromptEvent(new Context({ variables: new Variables({ Ans: 5 }) }), "A", 3),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 8, A: 3 }) }), "Ans + A", 8, false),
            new TestPromptEvent(new Context({ variables: new Variables({ Ans: 5, A: 3 }) }), "A", 7),
            new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 12, A: 7 }) }), "Ans + A", 12, false),
        ]),
    ],

    assignment: [
        expectInterpret("1+2 -> A", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
        ]),
        expectInterpret("1+2 -> A:", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
        ]),
        expectInterpret("1+2 -> A disp", new Context(), [
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, true),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, true),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "", 3, false),
        ]),
        expectInterpret("1+2 -> Ans", new Context(), [ new TestRuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 3 }) }), RuntimeSyntaxError, 4) ]),
        expectInterpret("1+2 -> A6", new Context(), [ new TestRuntimeErrorEvent(new Context({ variables: new Variables({ A: 0, Ans: 3 }) }), RuntimeSyntaxError, 5) ]),
        expectInterpret("5 -> A: 1 div 0 -> A:", new Context(), [ new TestRuntimeErrorEvent(new Context({ variables: new Variables({ A: 5, Ans: 5 }) }), RuntimeMathError, 7) ]),
        expectInterpret("B -> A: C -> B: A+B -> C", new Context({ variables: new Variables({ C: 1 }) }), [
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 0, B: 1, C: 1, Ans: 1 }) }), "A+B -> C", 1, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 1, B: 1, C: 2, Ans: 2 }) }), "A+B -> C", 2, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 1, B: 2, C: 3, Ans: 3 }) }), "A+B -> C", 3, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 2, B: 3, C: 5, Ans: 5 }) }), "A+B -> C", 5, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 3, B: 5, C: 8, Ans: 8 }) }), "A+B -> C", 8, false),
            new TestDisplayEvent(new Context({ variables: new Variables({ A: 5, B: 8, C: 13, Ans: 13 }) }), "A+B -> C", 13, false),
        ]),
    ],

    fatArrow: {
        falseResult: [
            expectInterpret("3 disp 0 => 1", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "3", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 0 }) }), "0 => 1", 0, false),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "3", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 0 }) }), "0 => 1", 0, false),
            ]),
            expectInterpret("3 disp 0 => 1:", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "3", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 0 }) }), "0 => 1", 0, false),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "3", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 0 }) }), "0 => 1", 0, false),
            ]),
            expectInterpret("3 disp 0 => 1 disp", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "3", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 0 }) }), "", 0, false),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "3", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 0 }) }), "", 0, false),
            ]),
            expectInterpret("0 => 1 div 0", new Context(), [ new TestDisplayEvent() ]),
            expectInterpret("0 => ,", new Context(), [ new TestDisplayEvent() ]),
            expectInterpret("0 => =", new Context(), [ new TestDisplayEvent() ]),
            expectInterpret("0 => 1 div 0 => 1 div 0", new Context(), [ new TestDisplayEvent() ]),
            expectInterpret("3: 0 => =>", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 4) ]),
            expectInterpret("0 => Goto", new Context(), [ new TestDisplayEvent() ]),
            expectInterpret("0 => Lbl", new Context(), [ new TestDisplayEvent() ]),
            expectInterpret("3: 0 => While 1", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 4) ]),
            expectInterpret("3: 0 => While 1", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 4) ]),
            expectInterpret("3: 0 => WhileEnd", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 4) ]),
            expectInterpret("3: 0 => Next", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 4) ]),
            expectInterpret("3: 0 => Break", new Context(), [ new TestDisplayEvent() ]),
            expectInterpret("3: 0 => Else", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeSyntaxError, 4) ]),
            expectInterpret("3: 0 => To", new Context(), [ new TestDisplayEvent() ]),

            expectInterpret("3: 0 => 1 disp 5", new Context(), [ new TestDisplayEvent(null, "5", 5, false) ]),
            expectInterpret("3: 0 => 1: 5", new Context(), [ new TestDisplayEvent(null, "5", 5, false) ]),
        ],
        trueResult: [
            expectInterpret("3 disp 1 => 5", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "3", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 5 }) }), "1 => 5", 5, false),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "3", 3, true),
            ]),
            expectInterpret("1 => 5:", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 5 }) }), "1 => 5", 5, false),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 5 }) }), "1 => 5", 5, false),
            ]),
            expectInterpret("1 => 5 disp", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 5 }) }), "1 => 5", 5, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 5 }) }), "", 5, false),
            ]),
            expectInterpret("1 => 2 => 3", new Context(), [ new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1 => 2 => 3", 3, false) ]),
            expectInterpret("1 => 2 => 3 disp", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1 => 2 => 3", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "", 3, false),
            ]),
            expectInterpret("1 => 0 => 3", new Context(), [ new TestDisplayEvent(new Context(), "1 => 0 => 3", 0, false) ]),
            expectInterpret("1 => 0 => 3 disp 8", new Context(), [ new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 8 }) }), "8", 8, false) ]),
            expectInterpret("1-3 => ? -> A", new Context(), [
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: -2 }) }), "A", 5),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: -2, A: 5 }) }), "? -> A", 5, false),
            ]),
            expectInterpret("5 => -8 => ? -> M disp", new Context(), [
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: -8 }) }), "M", 10),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: -8, M: 10 }) }), "? -> M", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: -8, M: 10 }) }), "", 10, false),
            ]),
        ],
    },

    gotoLbl: {
        lbl: [
            expectInterpret("2: ? -> A: Lbl 6", new Context(), [
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2 }) }), "A", 3),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), "Lbl 6", 3, false),
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), "A", 5),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 2, A: 5 }) }), "Lbl 6", 5, false),
            ]),
            expectInterpret("2: ? -> A: Lbl 6:", new Context(), [
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2 }) }), "A", 3),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), "Lbl 6", 3, false),
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), "A", 5),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 2, A: 5 }) }), "Lbl 6", 5, false),
            ]),
            expectInterpret("2: ? -> A: Lbl 6 disp", new Context(), [
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2 }) }), "A", 3),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), "Lbl 6", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), "", 3, false),
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), "A", 5),
            ]),
            expectInterpret("Lbl 0", new Context(), [ new TestDisplayEvent(new Context(), "Lbl 0", 0, false) ]),
            expectInterpret("Lbl 9", new Context(), [ new TestDisplayEvent(new Context(), "Lbl 9", 0, false) ]),
            expectInterpret("Lbl .", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 1) ]),
            expectInterpret("Lbl 10", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
            expectInterpret("Lbl 01", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
            expectInterpret("Lbl 1+2", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
            expectInterpret("Lbl sqrt(5", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 1) ]),
            expectInterpret("Lbl Lbl ", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 1) ]),
            expectInterpret("Lbl FreqOn", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 1) ]),
            expectInterpret("Lbl 2^2", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
            expectInterpret("Lbl 2?", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
        ],
        goto: [
            expectInterpret("2: ? -> A: Goto 6", new Context(), [
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2 }) }), "A", 3),
                new TestRuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), RuntimeGotoError, 7),
            ]),
            expectInterpret("2: ? -> A: Goto 6:", new Context(), [
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2 }) }), "A", 3),
                new TestRuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), RuntimeGotoError, 7),
            ]),
            expectInterpret("2: ? -> A: Goto 6 disp", new Context(), [
                new TestPromptEvent(new Context({ variables: new Variables({ Ans: 2 }) }), "A", 3),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), "Goto 6", 3, true),
                new TestRuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 2, A: 3 }) }), RuntimeGotoError, 7),
            ]),
            expectInterpret("Goto 0", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeGotoError, 1) ]),
            expectInterpret("Goto 9", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeGotoError, 1) ]),
            expectInterpret("Goto .", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 1) ]),
            expectInterpret("Goto 10", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
            expectInterpret("Goto 01", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
            expectInterpret("Goto 1+2", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
            expectInterpret("Goto sqrt(5", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 1) ]),
            expectInterpret("Goto Lbl ", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 1) ]),
            expectInterpret("Goto FreqOn", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 1) ]),
            expectInterpret("Goto 2^2", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
            expectInterpret("Goto 2?", new Context(), [ new TestRuntimeErrorEvent(new Context(), RuntimeArgumentError, 2) ]),
        ],
        jumping: [
            expectInterpret("4*5: Lbl 3 disp Ans + 2: Goto 3", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 20 }) }), "Lbl 3", 20, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 22 }) }), "Lbl 3", 22, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 24 }) }), "Lbl 3", 24, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 26 }) }), "Lbl 3", 26, true),
            ]),
            expectInterpret("4*5: Goto 3: Ans + 2: Lbl 3", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 20 }) }), "Lbl 3", 20, false),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 20 }) }), "Lbl 3", 20, false),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 20 }) }), "Lbl 3", 20, false),
            ]),
            expectInterpret("5 -> A: Lbl 2: A-1 => Goto 2 disp", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 4, A: 5 }) }), "A-1 => Goto 2", 4, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 4, A: 5 }) }), "A-1 => Goto 2", 4, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 4, A: 5 }) }), "A-1 => Goto 2", 4, true),
            ]),
            expectInterpret("5 -> A: Lbl 2: A-1 -> A disp A => Goto 2: ", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 4, A: 4 }) }), "A-1 -> A", 4, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 3, A: 3 }) }), "A-1 -> A", 3, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 2, A: 2 }) }), "A-1 -> A", 2, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 1, A: 1 }) }), "A-1 -> A", 1, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 0, A: 0 }) }), "A-1 -> A", 0, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 0, A: 0 }) }), "A => Goto 2", 0, false),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 4, A: 4 }) }), "A-1 -> A", 4, true),
            ]),
            expectInterpret("9 => Lbl 1 disp 10 disp Lbl 1: 11 disp Goto 1: 12", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 9 }) }), "9 => Lbl 1", 9, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 10 }) }), "10", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "Lbl 1", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 10 }) }), "10", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "Lbl 1", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 10 }) }), "10", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
            ]),
            expectInterpret("9 => Lbl 19 disp 10 disp Lbl 1: 11 disp Goto 1: 12", new Context(), [
                new TestRuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 9 }) }), RuntimeArgumentError, 4),
            ]),
            expectInterpret("0 => Lbl 1 disp 10 disp Lbl 1: 11 disp Goto 1: 12", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 10 }) }), "10", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "Lbl 1", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 10 }) }), "10", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "Lbl 1", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 10 }) }), "10", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
            ]),
            expectInterpret("0 => Lbl 19 disp 10 disp Lbl 1: 11 disp Goto 1: 12", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 10 }) }), "10", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
                new TestRuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 11 }) }), RuntimeArgumentError, 4),
            ]),
            expectInterpret("0 => Lbl sqrt(121 disp 10 disp Lbl 1: 11 disp Goto 1: 12", new Context(), [
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 10 }) }), "10", 10, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
                new TestDisplayEvent(new Context({ variables: new Variables({ Ans: 11 }) }), "11", 11, true),
            ]),
            expectInterpret("0 disp Goto 7: 1 disp Lbl 8: 2 disp Lbl 7: 3 disp Goto 8: 4", new Context(), [
                new TestDisplayEvent(null, "0", 0, true),
                new TestDisplayEvent(null, "3", 3, true),
                new TestDisplayEvent(null, "2", 2, true),
                new TestDisplayEvent(null, "3", 3, true),
                new TestDisplayEvent(null, "2", 2, true),
                new TestDisplayEvent(null, "3", 3, true),
                new TestDisplayEvent(null, "2", 2, true),
            ]),
        ],
    },
};

function testInterpreter() {
    test(interpreterTests);
}

testInterpreter();
