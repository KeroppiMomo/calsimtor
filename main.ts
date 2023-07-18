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
class RuntimeArgumentError extends RuntimeError {}
class RuntimeGotoError extends RuntimeError {}

type LexicalizationResult = {
    tokens: Token[];
    errorPosition: SourcePosition[];
};
function lexicalize(source: string, tokenSet: TokenType[]=Object.values(allTokenTypes)): LexicalizationResult {
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
        for (const type of tokenSet) {
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

function promptInput(context: Context, varName: VariableName) {
    return new Promise<number>((resolve) => {
        const execution = document.getElementById("execution")!;
        execution.appendChild(document.createTextNode(varName + "?"));

        const div = document.createElement("div");
        div.className = "sourceToken";

        const tokenInput = document.createElement("input");
        tokenInput.readOnly = true;

        const sourceInput = document.createElement("input");
        sourceInput.placeholder = context.variables[varName].toString();
        sourceInput.oninput = () => {
            const { tokens } = lexicalize(sourceInput.value, expressionTokenTypes);
            tokenInput.value = tokensToString(tokens);
        };
        sourceInput.addEventListener("keyup", (event) => {
            if (event.code === "Enter") {
                if (sourceInput.value === "") {
                    sourceInput.value = context.variables[varName].toString();
                    sourceInput.readOnly = true;
                    resolve(context.variables[varName]);
                } else {
                    const { tokens, errorPosition } = lexicalize(sourceInput.value, expressionTokenTypes);
                    if (errorPosition.length > 0) {
                        alert(`Lexicalization error: unknown symbol "${sourceInput.value[errorPosition[0]!.index]}". \nTry another input.`);
                        return;
                    }
                    try {
                        const val = evaluateExpression(new TokenIterator(tokens), context);
                        sourceInput.readOnly = true;
                        resolve(val);
                    } catch (err: unknown) {
                        console.error(err);
                        if (err instanceof RuntimeError) {
                            const errorName = (() => {
                                if (err instanceof RuntimeSyntaxError) return "Syntax ERROR";
                                else if (err instanceof RuntimeMathError) return "Math ERROR";
                                else if (err instanceof RuntimeStackError) return "Stack ERROR";
                                else return "Unknown runtime error";
                            })();
                            alert(`${errorName} at ${err.sourcePos.line+1}:${err.sourcePos.column+1} (${err.message})`);
                        } else {
                            alert("Unknown error (see console)");
                        }
                    }
                }
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
        function handler(event: KeyboardEvent) {
            if (event.code === "Enter") {
                resolve();
                document.removeEventListener("keyup", handler);
            }
        }
        document.addEventListener("keyup", handler);
    });
}

let tokens: Token[] = [];
let errorPosition = [];
function sourceOnInput(el: HTMLTextAreaElement) {
    const result = lexicalize(el.value);
    window.result = result;
    tokens = result.tokens;
    errorPosition = result.errorPosition;

    (document.getElementById("tokenError")! as HTMLTextAreaElement).value = tokenLogToString(result, el.value);
    (document.getElementById("shown")! as HTMLTextAreaElement).value = tokensToString(tokens);
}

function executeOnClick() {
    interpret(tokens, new Context(), {
        display: (_, tokens, value, isDisp) => display(tokens, value, isDisp),
        prompt: (context, varName) => promptInput(context, varName),
    });
}
