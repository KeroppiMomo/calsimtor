class TokenType {
    source: string;
    shown: string;

    constructor(source: string, shown?: string) {
        this.source = source;
        this.shown = shown ?? source;
    }
}

class SuffixFuncTokenType extends TokenType {
    fn: (x: number) => number;

    constructor(source: string, shown: string, fn: (x: number) => number);
    constructor(source: string, fn: (x: number) => number);
    constructor(source: string, arg1: string | ((x: number) => number), arg2?: (x: number) => number) {
        if (arg2 !== undefined) {
            // 1st definiiton
            const shown = arg1 as string;
            super(source, shown);
            this.fn = arg2;
        } else {
            // 2nd definition
            super(source, undefined);
            this.fn = arg1 as (x: number) => number;
        }
    }
}

type ParenFuncArgNum = number | number[];
type ParenFunc = (...args: number[]) => number;
class ParenFuncTokenType extends TokenType {
    argNum: ParenFuncArgNum;
    fn: ParenFunc;

    constructor(source: string, shown: string, argNum: ParenFuncArgNum, fn: ParenFunc);
    constructor(source: string, argNum: ParenFuncArgNum, fn: ParenFunc);
    constructor(source: string, arg1: string | ParenFuncArgNum, arg2: ParenFuncArgNum | ParenFunc, arg3?: ParenFunc) {
        if (arg3 !== undefined) {
            // 1st definiton
            const shown = arg1 as string;
            super(source, shown);
            this.argNum = arg2 as ParenFuncArgNum;
            this.fn = arg3;
        } else {
            // 2nd definition
            super(source, undefined);
            this.argNum = arg1 as ParenFuncArgNum;
            this.fn = arg2 as ParenFunc;
        }
    }
}

const literalTokenTypes = {
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

    exp: new TokenType("E"),
    dot: new TokenType("."),
};

const suffixFuncTokenTypes = {
    reciprocal: new SuffixFuncTokenType("^-1", "⁻¹", (x) => {
        if (x === 0) throw new RangeError("Division by 0");
        return 1/x;
    }),
    fact: new SuffixFuncTokenType("!", (x) => {
        if (!Number.isInteger(x)) throw new RangeError("Cannot take the factorial of a non-integer");
        if (x < 0) throw new RangeError("Cannot take the factorial of a negative value");
        if (x > 69) throw new RangeError("Cannot take the factorial of an integer larger than 69 (too large)");
        
        let ans = 1;
        for (let k = 2; k <= x; ++k) {
            ans *= k;
        }
        return ans;
    }),

    cube: new SuffixFuncTokenType("^3", "³", (x) => Math.pow(x,3)),

    square: new SuffixFuncTokenType("^2", "²", (x) => Math.pow(x,2)),

    percentage: new SuffixFuncTokenType("%", (x) => x/100),

    // asD: new TokenType("asD", "°"),
    // asR: new TokenType("asR", "ʳ"),
    // asG: new TokenType("asG", "ᵍ"),
};

const parenFuncTokenTypes = {
    cbrt: new ParenFuncTokenType("cbrt(", "³√", 1, Math.cbrt),
    sqrt: new ParenFuncTokenType("sqrt(", "√", 1, (x) => {
        if (x < 0) throw new RangeError("Cannot take the square root of negative value");
        else return Math.sqrt(x);
    }),
    log: new ParenFuncTokenType("log(", [1,2], (arg1, arg2) => {
        if (arg2 === undefined) {
            if (arg1 <= 0) throw new RangeError("Cannot take the log of a non-positive value");
            return Math.log10(arg1);
        } else {
            if (arg1 == 1) throw new RangeError("Base of log cannot be 1");
            if (arg1 <= 0) throw new RangeError("Base of log cannot be non-positive");
            if (arg2 <= 0) throw new RangeError("Cannot take the log of a non-positive value");
            return Math.log(arg2)/Math.log(arg1);
        }
    }),
    tenExp: new ParenFuncTokenType("10^(", 1, (x) => Math.pow(10, x)),
    ln: new ParenFuncTokenType("ln(", 1, (x) => {
        if (x <= 0) throw new RangeError("Cannot take the ln of a non-positive value");
        else return Math.log(x)
    }),
    eExp: new ParenFuncTokenType("e^(", 1, Math.exp),
    sin: new ParenFuncTokenType("sin(", 1, (x) => {
        // TODO
        return Math.sin(x)
    }),
    asin: new ParenFuncTokenType("asin(", "sin^-1(", 1, Math.asin),
    sinh: new ParenFuncTokenType("sinh(", 1, Math.sinh),
    asinh: new ParenFuncTokenType("asinh(", "sinh^-1(", 1, Math.asinh),
    cos: new ParenFuncTokenType("cos(", 1, Math.cos),
    acos: new ParenFuncTokenType("acos(", "cos^-1(", 1, Math.acos),
    cosh: new ParenFuncTokenType("cosh(", 1, Math.cosh),
    acosh: new ParenFuncTokenType("acosh(", "cosh^-1(", 1, Math.acosh),
    tan: new ParenFuncTokenType("tan(", 1, Math.tan),
    atan: new ParenFuncTokenType("atan(", "tan^-1(", 1, Math.atan),
    tanh: new ParenFuncTokenType("tanh(", 1, Math.tanh),
    atanh: new ParenFuncTokenType("atanh(", "tanh^-1(", 1, Math.atanh),
    // TODO
    // polar: new ParenFuncTokenType("Pol(", 2, ),
    // rect: new ParenFuncTokenType("Rec(", 2, ),
    rnd: new ParenFuncTokenType("Rnd(", 1, Math.round),
    abs: new ParenFuncTokenType("Abs(", 1, Math.abs),
    openBracket: new ParenFuncTokenType("(", 1, (x) => x),
};

const expressionTokenTypes = {
    ...literalTokenTypes,
    ...suffixFuncTokenTypes,
    ...parenFuncTokenTypes,

    frac: new TokenType("/", "┘"),

    power: new TokenType("^("),

    root: new TokenType("rt(", "x√"),

    e: new TokenType("e"),

    neg: new TokenType("neg", "-"),
    varA: new TokenType("A"),

    deg: new TokenType("deg", "°"),
    varB: new TokenType("B"),

    varC: new TokenType("C"),

    varD: new TokenType("D"),

    closeBracket: new TokenType(")"),
    varX: new TokenType("X"),

    comma: new TokenType(","),
    varY: new TokenType("Y"),

    mPlus: new TokenType("M+"),
    mMinus: new TokenType("M-"),
    varM: new TokenType("M"),

    plus: new TokenType("+"),
    minus: new TokenType("-"),
    multiply: new TokenType("*"),
    divide: new TokenType("div", "÷"),

    permutation: new TokenType("Per", "𝐏"),
    combination: new TokenType("Com", "𝐂"),

    ran: new TokenType("Ran#"),

    pi: new TokenType("pi", "π"),

    ans: new TokenType("Ans"),
};


const programTokenTypes = {
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

const allTokenTypes = {
    ...expressionTokenTypes,
    ...programTokenTypes,
};

function throwSyntax(i: number, tokens: Token[], failedMessage: string): never {
    const pos = (i >= tokens.length) ? tokens.at(-1)!.sourceEnd : tokens[i]!.sourceStart;
    throw new RuntimeSyntaxError(pos, i, failedMessage);
}
function throwMath(i: number, tokens: Token[], failedMessage: string) {
    const pos = (i >= tokens.length) ? tokens.at(-1)!.sourceEnd : tokens[i]!.sourceStart;
    throw new RuntimeMathError(pos, i, failedMessage);
}

enum Precedence {
    lowest = -999,
    L1 = 1, //
    L2,
    L3,
    /** Precedence of +, - */
    L4,
    /** Precedence of *, div */
    L5,
    /** Precedence of permutation, combination, angle */
    L6,
    /** Precedence of x hat, y hat etc */
    L7,
    /** Precedence of neg */
    L8,
    /** Precedence of frac */
    L9,
    /** Precedence of suffix functions */
    L10,
}

function acceptLiteral(tokens: Token[], i: number): {
    value: number,
    newI: number,
} {
    function isInBound() {
        return i >= 0 && i < tokens.length;
    }
    function isTokenNumber(token: Token): boolean {
        return Object.values(literalTokenTypes).includes(token.type) && token.type !== literalTokenTypes.exp && token.type !== literalTokenTypes.dot;
    }
    function tokenToNumber(token: Token): number {
        return parseInt(token.source);
    }

    const NEG_TYPE = [ allTokenTypes.minus, allTokenTypes.neg ];
    const POS_TYPE = [ allTokenTypes.plus ];

    let significand = 0;
    let exp = 0;

    // ((xxxxx)(.xxxxxx))(E(-)xx)

    if (tokens[i]!.type === literalTokenTypes.exp) {
        significand = 1;
    }

    for (; isInBound() && isTokenNumber(tokens[i]!); ++i) {
        significand = significand * 10 + tokenToNumber(tokens[i]!);
    }
    // Decimal point
    if (isInBound() && tokens[i]!.type === literalTokenTypes.dot) {
        ++i;
        for (let j = 1; isInBound() && isTokenNumber(tokens[i]!); ++i, ++j) {
            significand += tokenToNumber(tokens[i]!) * Math.pow(10, -j);
        }
    }
    // Exponent
    if (isInBound() && tokens[i]!.type === literalTokenTypes.exp) {
        ++i;

        let sign = +1;
        for (; isInBound(); ++i) {
            if (NEG_TYPE.includes(tokens[i]!.type)) sign *= -1;
            else if (POS_TYPE.includes(tokens[i]!.type)) {}
            else break;
        }

        if (!(isInBound() && isTokenNumber(tokens[i]!))) throwSyntax(i, tokens, "Missing number after exp");
        exp = tokenToNumber(tokens[i]!);
        ++i;

        if (isInBound() && isTokenNumber(tokens[i]!)) {
            exp = exp * 10 + tokenToNumber(tokens[i]!);
            ++i;

            if (isInBound() && isTokenNumber(tokens[i]!)) throwSyntax(i, tokens, "Exponents cannot have more than 2 numbers");
        }

        exp *= sign;
    }

    if (isInBound() && tokens[i]!.type === literalTokenTypes.dot)
        throwSyntax(i, tokens, "Dot is not allowed in exponent or after another dot");
    if (isInBound() && tokens[i]!.type === literalTokenTypes.exp)
        throwSyntax(i, tokens, "Literal cannot have more than one Exp");

    return {
        value: significand * Math.pow(10, exp),
        newI: i-1,
    };
}

function evaluateExpression(tokens: Token[]) {
    type Command = (cs: CommandStack, ns: NumericStack, pre: Precedence) => boolean;
    type CommandStack = {
        tokenType: TokenType,
        cmd: Command
    }[];
    type NumericStack = number[];

    const commandStack: CommandStack = [];
    const numericStack: NumericStack = [];

    function evalUntil(errorI: number, precedence: Precedence) {
        try {
            while (commandStack.length !== 0 && commandStack.at(-1)!.cmd(commandStack, numericStack, precedence));
        } catch (err) {
            if (err instanceof RangeError) {
                throwMath(errorI, tokens, err.message);
            } else {
                throw err;
            }
        }
    }

    function unaryCommand(cmdPrecedence: Precedence, fn: (x: number) => number): Command {
        return (cs, ns, pre) => {
            if (pre > cmdPrecedence) return false;
            if (ns.length === 0) throw new Error("Unary command expects at least one element in the numeric stack");
            ns.push(fn(ns.pop()!));
            cs.pop();
            return true;
        };
    }
    function binaryCommand(cmdPrecedence: Precedence, fn: (left: number, right: number) => number): Command {
        return (cs, ns, pre) => {
            if (pre > cmdPrecedence) return false;
            if (ns.length < 2) throw new Error("Binary command expects >=2 elemens in the numeric stack");
            const right = ns.pop()!;
            const left = ns.pop()!;
            ns.push(fn(left, right));
            cs.pop();
            return true;
        };
    }

    let expectNumber = true;
    for (let i = 0; i < tokens.length; ++i) {
        const cur = tokens[i]!;
        if (Object.values(literalTokenTypes).includes(cur.type)) {
            if (!expectNumber) throwSyntax(i, tokens, "Unexpected number");
            const {value, newI} = acceptLiteral(tokens, i);
            numericStack.push(value);
            i = newI;
            expectNumber = false;

        } else if (cur.type === allTokenTypes.plus) {
            if (expectNumber) {
                // nothing happens: more than 24 + does not cause STACK error
                expectNumber = true;
            } else {
                evalUntil(i, Precedence.L4);
                commandStack.push({
                    tokenType: allTokenTypes.plus,
                    cmd: binaryCommand(Precedence.L4, (left, right) => left + right),
                });
                expectNumber = true;
            }

        } else if (cur.type === allTokenTypes.minus || cur.type === allTokenTypes.neg) {
            if (expectNumber) {
                evalUntil(i, Precedence.L8);
                commandStack.push({
                    tokenType: allTokenTypes.neg,
                    cmd: unaryCommand(Precedence.L8, (x) => -x),
                });
                expectNumber = true;
            } else {
                if (cur.type === allTokenTypes.neg) throwSyntax(i, tokens, "Negative sign cannot follow a number");
                evalUntil(i, Precedence.L4);
                commandStack.push({
                    tokenType: allTokenTypes.minus,
                    cmd: binaryCommand(Precedence.L4, (left, right) => left - right),
                });
                expectNumber = true;
            }

        } else if (cur.type === allTokenTypes.multiply || cur.type === allTokenTypes.divide) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found multiply or divide instead");
            evalUntil(i, Precedence.L5);
            const fn: (left: number, right: number) => number = (() => {
                if (cur.type === allTokenTypes.multiply)
                    return (l: number, r: number) => l*r;
                else
                    return (l: number, r: number) => {
                        if (r === 0) throw new RangeError("Division by 0");
                        return l/r;
                    };
            })();
            commandStack.push({
                tokenType: cur.type,
                cmd: binaryCommand(Precedence.L5, fn),
            });
            expectNumber = true;

        } else if (cur.type === allTokenTypes.permutation || cur.type === allTokenTypes.combination) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found permutation or combination instead");
            evalUntil(i, Precedence.L6);
            const isComb = cur.type === allTokenTypes.combination;
            commandStack.push({
                tokenType: cur.type,
                cmd: binaryCommand(Precedence.L6, (n: number, r: number) => {
                    if (!Number.isInteger(n) || !Number.isInteger(r)) throw new RangeError("n and r in nPr must be integer");
                    if (!(0 <= r)) throw new RangeError("r cannot be negative in nPr");
                    if (!(r <= n)) throw new RangeError("n must be no less than r in nPr");
                    if (!(n < Math.pow(10, 10))) throw new RangeError("n must be less than 10^10 in nPr");

                    let ans = 1;
                    for (let k = 0; k < r; ++k) {
                        ans *= n-k;
                        if (isComb) ans /= k+1;
                    }
                    return ans;
                }),
            });
            expectNumber = true;

        } else if (cur.type === allTokenTypes.frac) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found frac instead");
            evalUntil(i, Precedence.L9);
            if (commandStack.length > 0 && commandStack.at(-1)!.tokenType === allTokenTypes.frac) {
                if (commandStack.length > 1 && commandStack.at(-2)!.tokenType === allTokenTypes.frac) throwSyntax(i, tokens, "3 Frac not allowed");
                commandStack.push({
                    tokenType: cur.type,
                    cmd: (cs, ns, pre) => {
                        if (pre === Precedence.L9) throw new Error("what? i thought 3 fracs are thrown already");
                        // Later frac evaluates first, then negative sign (L8), then this frac
                        if (pre >= Precedence.L8) return false;
                        if (ns.length < 3) throw new Error("Second frac command expects >=3 elements in the numeric stack");
                        cs.pop();
                        cs.pop();
                        const den = ns.pop()!;
                        const num = ns.pop()!;
                        const int = ns.pop()!;
                        if (den === 0) throw new RangeError("Division by 0");
                        if (num === 0) ns.push(int);
                        else if (int === 0) ns.push(num/den);
                        else {
                            const sign = Math.sign(den) * Math.sign(num) * Math.sign(int);
                            const magnitude = Math.abs(int) + Math.abs(num) / Math.abs(den);
                            ns.push(sign * magnitude);
                        }
                        return true;
                    },
                });
            } else {
                commandStack.push({
                    tokenType: cur.type,
                    cmd: (cs, ns, pre) => {
                        // If another frac appears later (L9), this should not evaluate
                        // Later frac evaluates first, then negative sign (L8), then this frac
                        if (pre >= Precedence.L8) return false;
                        if (ns.length < 2) throw new Error("Frac command expects >=2 elemens in the numeric stack");
                        const den = ns.pop()!;
                        const num = ns.pop()!;
                        if (den === 0) throw new RangeError("Division by 0");
                        ns.push(num / den);
                        cs.pop();
                        return true;
                    },
                });
            }
            expectNumber = true;

        } else if (cur.type instanceof SuffixFuncTokenType) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found suffix function instead");
            const fn = (cur.type as SuffixFuncTokenType).fn;
            commandStack.push({
                tokenType: cur.type,
                cmd: (cs, ns, pre) => {
                    if (pre > Precedence.L10) return false; // delete this?
                    if (ns.length === 0) throw new Error("Suffix function command expects >=1 elements in the numeric stack");
                    const x = ns.pop()!;
                    ns.push(fn(x));
                    cs.pop();
                    return true;
                },
            });
            evalUntil(i, Precedence.L10);
            expectNumber = false;

        } else {
            throw new Error("not supported token");
        }

        console.log(numericStack, commandStack);
    }
    if (expectNumber) {
        throwSyntax(tokens.length, tokens, "Expect number");
    }
    evalUntil(tokens.length, Precedence.lowest);

    return { numericStack, commandStack };
}
