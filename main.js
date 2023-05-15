class SourcePosition {
    constructor(index, line, column) {
        this.index = index;
        this.line = line;
        this.column = column;
    }
}

class TokenType {
    static exprOnly = {
        reciprocal: new TokenType("^-1", "⁻¹"),
        fact: new TokenType("!"),

        cube: new TokenType("^3", "³"),
        cbrt: new TokenType("cbrt(", "³√"),

        frac: new TokenType("/", "┘"),

        sqrt: new TokenType("sqrt(", "√"),

        square: new TokenType("^2", "²"),

        power: new TokenType("^("),

        root: new TokenType("rt(", "x√"),

        log: new TokenType("log("),
        tenExp: new TokenType("10^("),

        ln: new TokenType("ln("),
        eExp: new TokenType("e^("),
        e: new TokenType("e"),

        varA: new TokenType("A"),

        deg: new TokenType("deg", "°"),
        varB: new TokenType("B"),

        varC: new TokenType("C"),

        varD: new TokenType("D"),
        sin: new TokenType("sin"),
        asin: new TokenType("asin", "sin^-1"),
        sinh: new TokenType("sinh"),
        asinh: new TokenType("asinh", "sinh^-1"),

        cos: new TokenType("cos"),
        acos: new TokenType("acos", "cos^-1"),
        cosh: new TokenType("cosh"),
        acosh: new TokenType("acosh", "cosh^-1"),

        tan: new TokenType("tan"),
        atan: new TokenType("atan", "tan^-1"),
        tanh: new TokenType("tanh"),
        atanh: new TokenType("atanh", "tanh^-1"),

        openBracket: new TokenType("("),
        percentage: new TokenType("%"),

        closeBracket: new TokenType(")"),
        abs: new TokenType("Abs("),
        varX: new TokenType("X"),

        comma: new TokenType(","),
        varY: new TokenType("Y"),

        mPlus: new TokenType("M+"),
        mMinus: new TokenType("M-"),
        varM: new TokenType("M"),

        num0: new TokenType("0"),
        num1: new TokenType("1"),
        num2: new TokenType("2"),
        num3: new TokenType("3"),
        num4: new TokenType("4"),
        num5: new TokenType("5"),
        num6: new TokenType("6"),
        num7: new TokenType("7"),
        num8: new TokenType("8"),
        num9: new TokenType("9"),

        plus: new TokenType("+"),
        minus: new TokenType("-"),
        multiply: new TokenType("*"),
        divide: new TokenType("div", "÷"),

        permutation: new TokenType("Per", "𝐏"),
        combination: new TokenType("Com", "𝐂"),

        polar: new TokenType("Pol("),
        rect: new TokenType("Rec("),

        rnd: new TokenType("Rnd("),

        ran: new TokenType("Ran#"),
        dot: new TokenType("."),

        exp: new TokenType("E"),
        pi: new TokenType("pi", "π"),

        ans: new TokenType("Ans"),
        asD: new TokenType("asD", "°"),
        asR: new TokenType("asR", "ʳ"),
        asG: new TokenType("asG", "ᵍ"),
    };
    static all = {
        ...TokenType.exprOnly,

        clrMemory: new TokenType("ClrMemory"),

        prompt: new TokenType("?"),
        assign: new TokenType("->", "→"),
        separator: new TokenType(":", ": "),
        disp: new TokenType("disp", "◢ "),
        fatArrow: new TokenType("=>", "⇒"),
        eq: new TokenType("="),
        neq: new TokenType("<>", "≠"),
        greater: new TokenType(">"),
        less: new TokenType("<"),
        geq: new TokenType(">=", "≥"),
        leq: new TokenType("<=", "≤"),
        goto: new TokenType("Goto", "Goto "),
        lbl: new TokenType("Lbl", "Lbl "),
        while: new TokenType("While", "While "),
        whileEnd: new TokenType("WhileEnd"),
        next: new TokenType("Next"),
        break: new TokenType("Break"),
        for: new TokenType("For", "For "),
        to: new TokenType("To", " To "),
        step: new TokenType("Step", " Step "),
        else: new TokenType("Else", "Else "),
        ifEnd: new TokenType("IfEnd"),
        if: new TokenType("If", "If "),
        then: new TokenType("Then", "Then "),
    };

    constructor(source, shown=null) {
        this.source = source;
        this.shown = (shown === null) ? source : shown;
    }
}

class Token {
    get source() {
        return this.type.source;
    }
    get shown() {
        return this.type.shown;
    }
    constructor(type, sourceStart, sourceEnd) {
        this.type = type;
        this.sourceStart = sourceStart;
        this.sourceEnd = sourceEnd;
    }
}

class RuntimeError {
    constructor(sourcePos, tokenI, message) {
        this.sourcePos = sourcePos;
        this.tokenI = tokenI;
        this.message = message;
    }
}
class RuntimeSyntaxError extends RuntimeError {}

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

    constructor(name) {
        this.name = name;
        this.value = 0;
    }
}

function lexicalize(source, tokenSet=TokenType.all) {
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

function tokensToString(tokens) {
    return tokens.reduce((prev, cur) => prev + cur.shown, "");
}
function tokenLogToString(result, source) {
    return result.errorPosition.reduce(
        (prev, cur) => `${prev}${cur.line+1}:${cur.column+1} Unknown symbol "${source[cur.index]}" (skipped)\n`,
        `Lexicalization completed (${result.tokens.length} bytes)\n${errorPosition.length} error(s) found\n\n`
    );
}

function displayRuntimeError(err) {
    const execution = document.getElementById("execution");

    let errorName;
    if (err instanceof RuntimeSyntaxError) {
        errorName = "Syntax ERROR";
    } else {
        errorName = "Unknown ERROR (please see console)";
        console.log(err);
    }

    const message = `${errorName} at ${err.sourcePos.line+1}:${err.sourcePos.column+1} (${err.message})`;

    execution.appendChild(document.createTextNode(message));
    execution.appendChild(document.createElement("br"));
    execution.appendChild(document.createElement("br"));
}

function promptAssign(variable) {
    return new Promise((resolve) => {
        const execution = document.getElementById("execution");
        execution.appendChild(document.createTextNode(variable.name + "?"));

        const div = document.createElement("div");
        div.className = "sourceToken";

        const tokenInput = document.createElement("input");
        tokenInput.readonly = true;

        const sourceInput = document.createElement("input");
        sourceInput.placeholder = variable.value.toString();
        sourceInput.oninput = () => {
            const { tokens } = lexicalize(sourceInput.value, TokenType.exprOnly);
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

function display(tokens, val, disp=true) {
    return new Promise((resolve) => {
        let code = tokensToString(tokens);
        if (disp) {
            code += "       (Disp)";
        }
        execution.appendChild(document.createTextNode(code));
        execution.appendChild(document.createElement("br"));
        execution.appendChild(document.createTextNode(parseInt(val)));
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

async function interpret(tokens) {
    try {
        while (true) {
            let i = 0;
            function throwRuntime(failedMessage) {
                const pos = (i >= tokens.length) ? tokens.at(-1).sourceEnd : tokens[i].sourceStart;
                throw new RuntimeSyntaxError(pos, i, failedMessage);
            }
            function expectNext(type, failedMessage) {
                if (i != tokens.length && tokens[i].type === type) {
                    i++;
                    return;
                }
                throwRuntime(failedMessage);
            }
            function expectEnd(failedMessage) {
                if (i === tokens.length || tokens[i].type === TokenType.all.separator || tokens[i].type === TokenType.all.disp) {
                    return;
                }
                throwRuntime(failedMessage);
            }

            while (i < tokens.length) {
                const oriI = i;
                const token = tokens[i];
                let value;
                if (token.type === TokenType.all.prompt) {
                    i++;
                    expectNext(TokenType.all.assign, "Input prompt expects assignment");
                    if (i === tokens.length || !(tokens[i].source in Variable.all)) {
                        throwRuntime("Input prompt expects variable");
                    }
                    const variable = Variable.all[tokens[i].source];
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
                } else if (tokens[i].type === TokenType.all.separator) {
                    i++;
                    if (i == tokens.length) {
                        await display(tokens.slice(oriI, i-1), value, false);
                    }
                } else if (tokens[i].type === TokenType.all.disp) {
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
    } catch (e) {
        displayRuntimeError(e);
    }
}

let tokens = [];
let errorPosition = [];
function sourceOnInput(el) {
    const result = lexicalize(el.value);
    tokens = result.tokens;
    errorPosition = result.errorPosition;

    document.getElementById("tokenError").value = tokenLogToString(result, el.value);
    document.getElementById("shown").value = tokensToString(tokens);
}
