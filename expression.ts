class TokenType {
    source: string;
    shown: string;

    constructor(source: string, shown?: string) {
        this.source = source;
        this.shown = shown ?? source;
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

const expressionTokenTypes = {
    ...literalTokenTypes,

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

    neg: new TokenType("neg", "-"),
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

    pi: new TokenType("pi", "π"),

    ans: new TokenType("Ans"),
    asD: new TokenType("asD", "°"),
    asR: new TokenType("asR", "ʳ"),
    asG: new TokenType("asG", "ᵍ"),
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

function throwRuntime(i: number, input: (Expression | Token)[], failedMessage: string): never {
    const token: Token = (() => {
        const j = (i >= input.length) ? input.length - 1 : i;
        const cur = input[j]!;
        if (cur instanceof Token) return cur;
        else return cur.tokens[0]!;
    })();
    const pos = (i >= tokens.length) ? token.sourceEnd : token.sourceStart;
    throw new RuntimeSyntaxError(pos, i, failedMessage);
}

interface Expression {
    tokens: Token[];

    evaluate(): number;
}

class LiteralExpression implements Expression {
    constructor(
        public tokens: Token[],
        public value: number,
    ) {}

    evaluate() {
        return this.value;
    }

    static replaceTokens(input: (Expression | Token)[]): (Expression | Token)[] {
        function isInBound(i: number) {
            return i >= 0 && i < tokens.length;
        }
        function isHandled(inputEl: Expression | Token): inputEl is Token {
            return inputEl instanceof Token && Object.values(literalTokenTypes).includes(inputEl.type);
        }
        function isInputTypeNumber(inputEl: Expression | Token): inputEl is Token {
            return isHandled(inputEl) && inputEl.type !== literalTokenTypes.exp && inputEl.type !== literalTokenTypes.dot;
        }
        function tokenToNumber(token: Token): number {
            return parseInt(token.source);
        }

        const NEG_TYPE = [ allTokenTypes.minus, allTokenTypes.neg ];
        const POS_TYPE = [ allTokenTypes.plus ];

        const result: (Expression | Token)[] = [];
        for (let i = 0; isInBound(i);) {
            const cur: Expression | Token = input[i]!;
            if (!isHandled(cur)) {
                result.push(cur);
                i++;
                continue;
            }

            const tokensInExpr: Token[] = [];

            function next(): void {
                const inputEl = input[i];
                if (!(inputEl instanceof Token)) throw new TypeError("Expect input[i] to be a Token");
                tokensInExpr.push(inputEl);
                ++i;
            }

            let significand = 0;
            let exp = 0;

            // ((xxxxx)(.xxxxxx))(E(-)xx)

            if (cur.type === literalTokenTypes.exp) {
                significand = 1;
            }

            for (; isInBound(i) && isInputTypeNumber(input[i]!); next()) {
                significand = significand * 10 + tokenToNumber(input[i] as Token);
            }
            // Decimal point
            if (isInBound(i) && isHandled(input[i]!) && (input[i] as Token).type === literalTokenTypes.dot) {
                next();
                for (let j = 1; isInBound(i) && isInputTypeNumber(input[i]!); next(), ++j) {
                    significand += tokenToNumber(input[i] as Token) * Math.pow(10, -j);
                }
            }
            // Exponent
            if (isInBound(i) && isHandled(input[i]!) && (input[i] as Token).type === literalTokenTypes.exp) {
                next();
                
                let sign = +1;
                for (; isInBound(i) && input[i] instanceof Token; next()) {
                    if (NEG_TYPE.includes((input[i] as Token).type)) sign *= -1;
                    else if (POS_TYPE.includes((input[i] as Token).type)) {}
                    else break;
                }

                if (!(isInBound(i) && isInputTypeNumber(input[i]!))) throwRuntime(i, input, "Missing number after exp");
                exp = tokenToNumber(input[i] as Token);
                next();

                if (isInBound(i) && isInputTypeNumber(input[i]!)) {
                    exp = exp * 10 + tokenToNumber(input[i] as Token);
                    next();

                    if (isInBound(i) && isInputTypeNumber(input[i]!)) throwRuntime(i, input, "Exponents cannot have more than 2 numbers");
                }

                exp *= sign;
            }

            if (isInBound(i) && isHandled(input[i]!) && (input[i] as Token).type === literalTokenTypes.dot)
                throwRuntime(i, input, "Dot is not allowed in exponent or after another dot");
            if (isInBound(i) && isHandled(input[i]!) && (input[i] as Token).type === literalTokenTypes.exp)
                throwRuntime(i, input, "Literal cannot have more than one Exp");

            const expr = new LiteralExpression(tokensInExpr, significand * Math.pow(10, exp));
            result.push(expr);
        }

        return result;
    }
}

function buildExpressionTree(input: (Expression | Token)[]) {
    input = LiteralExpression.replaceTokens(input);
    return input;
    // replaceBracket; // with ^( and rt
    // replacePriority2Suffix; // deg thing second and third thing cannot do (number)(suffix function)
    // replaceFraction;
    // replaceNegative;
    // // statistical (x hat etc)
    // replacePermCombAngle;
    // addOmittedMultiplication;
    // replaceMulDiv;
    // replaceAddMin;
    // replaceRelation;
    // // logical operators
}
