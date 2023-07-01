class EventMismatchError extends Error {}
class InterpreterBreakError extends Error {}

class PromptEvent {
    constructor(
        public context: Context | null,
        public varName: VariableName | null,
        public returns: number,
    ) {}

    testAndReturn(context: Context, varName: VariableName) {
        if (this.context !== null && !this.context.equals(context)) {
            throw new EventMismatchError(`Context mismatch: expected ${JSON.stringify(this.context)}, got ${JSON.stringify(context)}`);
        }
        if (this.varName !== null && this.varName !== varName) {
            throw new EventMismatchError(`Variable name mismatch: expected ${this.varName}, got ${varName}`);
        }
        return this.returns;
    }
}
class DisplayEvent {
    tokens: Token[] | null;

    constructor(
        public context: Context | null,
        tokensString: string | null,
        public value: number | null,
        public isDisp: boolean | null,
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

    test(context: Context, tokens: Token[], value: number, isDisp: boolean) {
        if (this.context !== null && !this.context.equals(context)) {
            throw new EventMismatchError(`Context mismatch: expected ${JSON.stringify(this.context)}, got ${JSON.stringify(context)}`);
        }
        if (this.tokens !== null) {
            if (this.tokens.length !== tokens.length || !this.tokens.every((t, i) => t.type === tokens[i]!.type)) {
                throw new EventMismatchError(`Tokens mismatch: expected ${this.tokens}, got ${tokens}`);
            }
        }
        if (this.value !== null && this.value !== value) {
            throw new EventMismatchError(`Value mismatch: expected ${this.value}, got ${value}`);
        }
        if (this.isDisp !== null && this.isDisp !== isDisp) {
            throw new EventMismatchError(`isDisp mismatch: expected ${this.isDisp}, got ${isDisp}`);
        }
    }
}
class RuntimeErrorEvent {
    constructor(
        public context: Context | null,
        public ErrorClass: typeof RuntimeError | null,
        public tokenI: number | null,
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
type InterpreterEvent = PromptEvent | DisplayEvent | RuntimeErrorEvent;

function expectInterpret(input: string, context: Context, ioEvents: InterpreterEvent[]): TestCase {
    return async () => {
        const { tokens, errorPosition } = lexicalize(input);
        if (errorPosition.length > 0) {
            console.error(`Input string has a lexical error at ${errorPosition[0]}`);
            return false;
        }

        let ioEventI = 0;
        async function prompt(context: Context, varName: VariableName): Promise<number> {
            const event = ioEvents[ioEventI];
            if (!(event instanceof PromptEvent)) throw new EventMismatchError(`Expected a prompt event`);

            const returns = event.testAndReturn(context, varName);

            ioEventI++;
            if (ioEventI >= ioEvents.length) throw new InterpreterBreakError();

            return returns;
        }
        async function display(context: Context, tokens: Token[], value: number, isDisp: boolean) {
            if (ioEventI >= ioEvents.length) throw new InterpreterBreakError();
            const event = ioEvents[ioEventI];
            if (!(event instanceof DisplayEvent)) throw new EventMismatchError(`Expected a display event`);

            event.test(context, tokens, value, isDisp);

            ioEventI++;
            if (ioEventI >= ioEvents.length) throw new InterpreterBreakError();
        }

        try {
            await interpret(tokens, context, { prompt, display });
            return true;
        } catch (err: unknown) {
            if (err instanceof InterpreterBreakError) {
                return true;
            } else if (err instanceof EventMismatchError) {
                console.error(`(During event ${ioEventI}) `, err.message);
                return false;
            } else if (err instanceof RuntimeError) {
                try {
                    const event = ioEvents[ioEventI];
                    if (!(event instanceof RuntimeErrorEvent)) throw new EventMismatchError(`Expected a runtime error event`);
                    event.test(context, err);
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
    };
}

const interpreterTests: TestCases = {
    prompt: {
        functionality: [
            expectInterpret("? -> A", new Context(), [
                new PromptEvent(new Context(), "A", 42),
                new DisplayEvent(new Context({ variables: new Variables({ A: 42, Ans: 0 }) }), "? -> A", 42, false),
                new PromptEvent(new Context({ variables: new Variables({ A: 42, Ans: 0 }) }), "A", 69),
                new DisplayEvent(new Context({ variables: new Variables({ A: 69, Ans: 0 }) }), "? -> A", 69, false),
                new PromptEvent(new Context({ variables: new Variables({ A: 69, Ans: 0 }) }), "A", -4),
                new DisplayEvent(new Context({ variables: new Variables({ A: -4, Ans: 0 }) }), "? -> A", -4, false),
            ]),
            expectInterpret("? -> Ans", new Context(), [
                new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2),
            ]),
            expectInterpret("? -> B:", new Context(), [
                new PromptEvent(new Context(), "B", 1),
                new DisplayEvent(new Context({ variables: new Variables({ B: 1, Ans: 0 }) }), "? -> B", 1, false),
                new PromptEvent(new Context({ variables: new Variables({ B: 1, Ans: 0}) }), "B", 2),
                new DisplayEvent(new Context({ variables: new Variables({ B: 2, Ans: 0 }) }), "? -> B", 2, false),
            ]),
            expectInterpret("? -> C disp", new Context(), [
                new PromptEvent(new Context(), "C", 3),
                new DisplayEvent(new Context({ variables: new Variables({ C: 3, Ans: 0 }) }), "? -> C", 3, true),
                new DisplayEvent(new Context({ variables: new Variables({ C: 3, Ans: 0 }) }), "", 3, false),
                new PromptEvent(new Context({ variables: new Variables({ C: 3, Ans: 0 }) }), "C", 4),
                new DisplayEvent(new Context({ variables: new Variables({ C: 4, Ans: 0 }) }), "? -> C", 4, true),
                new DisplayEvent(new Context({ variables: new Variables({ C: 4, Ans: 0 }) }), "", 4, false),
            ]),
            expectInterpret("? -> D: ? -> X disp ? -> Y", new Context(), [
                new PromptEvent(new Context(), "D", 5),
                new PromptEvent(new Context({ variables: new Variables({ D: 5, Ans: 0 }) }), "X", 6),
                new DisplayEvent(new Context({ variables: new Variables({ D: 5, X: 6, Ans: 0 }) }), "? -> X", 6, true),
                new PromptEvent(new Context({ variables: new Variables({ D: 5, X: 6, Ans: 0 }) }), "Y", 7),
                new DisplayEvent(new Context({ variables: new Variables({ D: 5, X: 6, Y: 7, Ans: 0 }) }), "? -> Y", 7, false),
                new PromptEvent(new Context({ variables: new Variables({ D: 5, X: 6, Y: 7, Ans: 0 }) }), "D", 8),
            ]),
        ],

        syntax: [
            expectInterpret("?", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 1) ]),
            expectInterpret("?A", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 1) ]),
            expectInterpret("??", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 1) ]),
            expectInterpret("? ->", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
            expectInterpret("? -> 6", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
            expectInterpret("? -> ->", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
            expectInterpret("? -> ?", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
            expectInterpret("? -> A ->", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 3) ]),
            expectInterpret("? -> Ans ->", new Context(), [ new RuntimeErrorEvent(new Context(), RuntimeSyntaxError, 2) ]),
        ],
    },

    expression: [
        expectInterpret("1+2", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
        ]),
        expectInterpret("1+2:", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, false),
        ]),
        expectInterpret("1+2 disp", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, true),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "1+2", 3, true),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "", 3, false),
        ]),
        expectInterpret("log(10", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, false),
        ]),
        expectInterpret("log(10:", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, false),
        ]),
        expectInterpret("log(10 disp", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, true),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "", 1, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "log(10", 1, true),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 1 }) }), "", 1, false),
        ]),
        expectInterpret("6: 1 div 0 disp", new Context(), [ new RuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 6 }) }), RuntimeMathError, 5) ]),
        expectInterpret("6: 1 div 0", new Context(), [ new RuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 6 }) }), RuntimeMathError, 5) ]),
        expectInterpret("Ans+3", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 3 }) }), "Ans+3", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 6 }) }), "Ans+3", 6, false),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 9 }) }), "Ans+3", 9, false),
        ]),
        expectInterpret("5: ? -> A: Ans + A", new Context(), [
            new PromptEvent(new Context({ variables: new Variables({ Ans: 5 }) }), "A", 3),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 8, A: 3 }) }), "Ans + A", 8, false),
            new PromptEvent(new Context({ variables: new Variables({ Ans: 5, A: 3 }) }), "A", 7),
            new DisplayEvent(new Context({ variables: new Variables({ Ans: 12, A: 7 }) }), "Ans + A", 12, false),
        ]),
    ],

    assignment: [
        expectInterpret("1+2 -> A", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
        ]),
        expectInterpret("1+2 -> A:", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, false),
        ]),
        expectInterpret("1+2 -> A disp", new Context(), [
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, true),
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "1+2 -> A", 3, true),
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, Ans: 3 }) }), "", 3, false),
        ]),
        expectInterpret("1+2 -> Ans", new Context(), [ new RuntimeErrorEvent(new Context({ variables: new Variables({ Ans: 3 }) }), RuntimeSyntaxError, 4) ]),
        expectInterpret("1+2 -> A6", new Context(), [ new RuntimeErrorEvent(new Context({ variables: new Variables({ A: 0, Ans: 3 }) }), RuntimeSyntaxError, 5) ]),
        expectInterpret("5 -> A: 1 div 0 -> A:", new Context(), [ new RuntimeErrorEvent(new Context({ variables: new Variables({ A: 5, Ans: 5 }) }), RuntimeMathError, 7) ]),
        expectInterpret("B -> A: C -> B: A+B -> C", new Context({ variables: new Variables({ C: 1 }) }), [
            new DisplayEvent(new Context({ variables: new Variables({ A: 0, B: 1, C: 1, Ans: 1 }) }), "A+B -> C", 1, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 1, B: 1, C: 2, Ans: 2 }) }), "A+B -> C", 2, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 1, B: 2, C: 3, Ans: 3 }) }), "A+B -> C", 3, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 2, B: 3, C: 5, Ans: 5 }) }), "A+B -> C", 5, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 3, B: 5, C: 8, Ans: 8 }) }), "A+B -> C", 8, false),
            new DisplayEvent(new Context({ variables: new Variables({ A: 5, B: 8, C: 13, Ans: 13 }) }), "A+B -> C", 13, false),
        ]),
    ],
};

function testInterpreter() {
    test(interpreterTests);
}

testInterpreter();
