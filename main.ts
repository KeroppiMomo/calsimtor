class SourcePosition {
    constructor(
        public index: number,
        public line: number,
        public column: number,
    ) {}
}

class Token {
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

class RuntimeError extends Error {
    constructor(
        public sourcePos: SourcePosition,
        public tokenI: number,
        message: string,
    ) {
        super(message);
    }
}
class RuntimeSyntaxError extends RuntimeError {}
class RuntimeMathError extends RuntimeError {}
class RuntimeStackError extends RuntimeError {}

class Variable {
    static all = {
        A: new Variable("A"),
        B: new Variable("B"),
        C: new Variable("C"),
        D: new Variable("D"),
        X: new Variable("X"),
        Y: new Variable("Y"),
        M: new Variable("M"),
        Ans: new Variable("Ans"),
    };

    value = 0;

    constructor(public name: string) {}
}

type LexicalizationResult = {
    tokens: Token[];
    errorPosition: SourcePosition[];
};
function lexicalize(source: string, tokenSet: Record<string, TokenType>=allTokenTypes): LexicalizationResult {
    const tokens = [];
    const errorPosition = [];
    let curLine = 0;
    let curColumn = 0;
    for (let i = 0; i < source.length;) {
        if (source[i] === " ") {
            i++;
            curColumn++;
            continue;
        } else if (source[i] === "\n") {
            curColumn = 0;
            curLine++;
            i++;
            continue;
        }

        let matched = null;
        for (const type of Object.values(tokenSet)) {
            const n = type.source.length;
            if (source.substr(i, n) === type.source && (matched == null || n > matched.source.length)) {
                matched = type;
            }
        }
        if (!matched) {
            errorPosition.push(new SourcePosition(i, curLine, curColumn));
            i++;
            curColumn++;
            continue;
        }
        tokens.push(new Token(
            matched,
            new SourcePosition(i, curLine, curColumn),
            new SourcePosition(i+matched.source.length, curLine, curColumn+matched.source.length)
        ));
        i += matched.source.length;
        curColumn += matched.source.length;
    }

    return {
        tokens,
        errorPosition,
    };
}

function tokensToString(tokens: Token[]) {
    return tokens.reduce((prev, cur) => prev + cur.shown, "");
}
function tokenLogToString(result: LexicalizationResult, source: string) {
    return result.errorPosition.reduce(
        (prev: string, cur: SourcePosition) => `${prev}${cur.line+1}:${cur.column+1} Unknown symbol "${source[cur.index]}" (skipped)\n`,
        `Lexicalization completed (${result.tokens.length} bytes)\n${errorPosition.length} error(s) found\n\n`
    );
}

function displayRuntimeError(err: RuntimeError) {
    const execution = document.getElementById("execution")!;

    let errorName;
    console.error(err);
    if (err instanceof RuntimeSyntaxError) {
        errorName = "Syntax ERROR";
    } else {
        errorName = "Unknown ERROR (please see console)";
    }

    const message = `${errorName} at ${err.sourcePos.line+1}:${err.sourcePos.column+1} (${err.message})`;

    execution.appendChild(document.createTextNode(message));
    execution.appendChild(document.createElement("br"));
    execution.appendChild(document.createElement("br"));
}

function promptAssign(variable: Variable) {
    return new Promise<void>((resolve) => {
        const execution = document.getElementById("execution")!;
        execution.appendChild(document.createTextNode(variable.name + "?"));

        const div = document.createElement("div");
        div.className = "sourceToken";

        const tokenInput = document.createElement("input");
        tokenInput.readOnly = true;

        const sourceInput = document.createElement("input");
        sourceInput.placeholder = variable.value.toString();
        sourceInput.oninput = () => {
            const { tokens } = lexicalize(sourceInput.value, expressionTokenTypes);
            tokenInput.value = tokensToString(tokens);
        };
        sourceInput.addEventListener("keyup", (event) => {
            if (event.code === "Enter") {
                // TODO
                sourceInput.readOnly = true;
                if (sourceInput.value === "") {
                    sourceInput.value = variable.value.toString();
                }
                variable.value = parseInt(sourceInput.value);
                resolve();
            }
        });

        div.appendChild(sourceInput);
        div.appendChild(tokenInput);

        execution.appendChild(div);
        execution.appendChild(document.createElement("br"));

        sourceInput.focus();
    });
}

function display(tokens: Token[], val: number, disp=true) {
    return new Promise<void>((resolve) => {
        let code = tokensToString(tokens);
        if (disp) {
            code += "       (Disp)";
        }
        const execution = document.getElementById("execution")!;
        execution.appendChild(document.createTextNode(code));
        execution.appendChild(document.createElement("br"));
        execution.appendChild(document.createTextNode(val.toString()));
        execution.appendChild(document.createElement("br"));
        execution.appendChild(document.createElement("br"));
        document.addEventListener("keyup", (event) => {
            if (event.code === "Enter") {
                console.log("hello");
                resolve();
            }
        });
    });
}

async function interpret(tokens: Token[]) {
    try {
        if (tokens.length == 0) {
            throw new RuntimeSyntaxError(new SourcePosition(0, 0, 0), 0, "Empty program");
        }
        while (true) {
            let i = 0;
            function throwRuntime(failedMessage: string): never {
                const pos = (i >= tokens.length) ? tokens.at(-1)!.sourceEnd : tokens[i]!.sourceStart;
                throw new RuntimeSyntaxError(pos, i, failedMessage);
            }
            function expectNext(type: TokenType, failedMessage: string) {
                if (i != tokens.length && tokens[i]!.type === type) {
                    i++;
                    return;
                }
                throwRuntime(failedMessage);
            }
            function expectEnd(failedMessage: string) {
                if (i === tokens.length || tokens[i]!.type === programTokenTypes.separator || tokens[i]!.type === programTokenTypes.disp) {
                    return;
                }
                throwRuntime(failedMessage);
            }

            while (i < tokens.length) {
                const oriI = i;
                const token = tokens[i]!;
                let value: number;
                if (token.type === programTokenTypes.prompt) {
                    i++;
                    expectNext(programTokenTypes.assign, "Input prompt expects assignment");
                    const varName = tokens[i]!.source;
                    if (i === tokens.length || !(varName in Variable.all)) {
                        throwRuntime("Input prompt expects variable");
                    }
                    const variable = Variable.all[varName as keyof typeof Variable.all];
                    if (variable === Variable.all.Ans) {
                        throwRuntime("Cannot assignment to Ans");
                    }
                    i++;
                    expectEnd("Input prompt expects ending after variable");
                    await promptAssign(variable);
                    value = variable.value;
                } else {
                    throwRuntime("Unexpected token");
                }

                if (i === tokens.length) {
                    await display(tokens.slice(oriI, i), value, false);
                } else if (tokens[i]!.type === programTokenTypes.separator) {
                    i++;
                    if (i == tokens.length) {
                        await display(tokens.slice(oriI, i-1), value, false);
                    }
                } else if (tokens[i]!.type === programTokenTypes.disp) {
                    await display(tokens.slice(oriI, i), value, true);
                    i++;
                    if (i == tokens.length) {
                        await display([], value, false);
                    }
                } else {
                    throwRuntime("Ending expected");
                }
            }
        }
    } catch (e: unknown) {
        if (e instanceof RuntimeError) {
            displayRuntimeError(e);
        } else {
            throw e;
        }
    }
}

let tokens = [];
let errorPosition = [];
function sourceOnInput(el: HTMLTextAreaElement) {
    const result = lexicalize(el.value);
    window.result = result;
    tokens = result.tokens;
    errorPosition = result.errorPosition;

    (document.getElementById("tokenError")! as HTMLTextAreaElement).value = tokenLogToString(result, el.value);
    (document.getElementById("shown")! as HTMLTextAreaElement).value = tokensToString(tokens);
}
