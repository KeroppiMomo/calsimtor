function throwSyntax(iter: TokenIterator, failedMessage: string): never {
    const pos = iter.isInBound() ? iter.cur()!.sourceStart : iter.last()!.sourceEnd;
    throw new RuntimeSyntaxError(pos, iter.i, failedMessage);
}
function throwMath(iter: TokenIterator, failedMessage: string): never {
    const pos = iter.isInBound() ? iter.cur()!.sourceStart : iter.last()!.sourceEnd;
    throw new RuntimeMathError(pos, iter.i, failedMessage);
}

enum Precedence {
    lowest = -999,
    comma = -2,
    closeBracket = -1, // don't really know if the order matters
    L1 = 1, //
    L2,
    L3,
    /** Precedence of +, - */
    L4,
    /** Precedence of *, div */
    L5,
    /** Precedence of permutation, combination, angle */
    L6,
    /** Precedence of omitted multiplication */
    L7,
    /** Precedence of x hat, y hat etc */
    L8,
    /** Precedence of neg */
    L9,
    /** Precedence of frac */
    L10,
    /** Precedence of suffix functions */
    L11,
}

class TokenIterator {
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

function acceptLiteral(iter: TokenIterator): number {
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

    if (iter.cur()!.type === literalTokenTypes.exp) {
        significand = 1;
    }

    for (; iter.isInBound() && isTokenNumber(iter.cur()!); iter.next()) {
        significand = significand * 10 + tokenToNumber(iter.cur()!);
    }
    // Decimal point
    if (iter.isInBound() && iter.cur()!.type === literalTokenTypes.dot) {
        iter.next();
        for (let j = 1; iter.isInBound() && isTokenNumber(iter.cur()!); iter.next(), ++j) {
            significand += tokenToNumber(iter.cur()!) * Math.pow(10, -j);
        }
    }
    // Exponent
    if (iter.isInBound() && iter.cur()!.type === literalTokenTypes.exp) {
        iter.next();

        let sign = +1;
        for (; iter.isInBound(); iter.next()) {
            if (NEG_TYPE.includes(iter.cur()!.type)) sign *= -1;
            else if (POS_TYPE.includes(iter.cur()!.type)) {}
            else break;
        }

        if (!(iter.isInBound() && isTokenNumber(iter.cur()!))) throwSyntax(iter, "Missing number after exp");
        exp = tokenToNumber(iter.cur()!);
        iter.next();

        if (iter.isInBound() && isTokenNumber(iter.cur()!)) {
            exp = exp * 10 + tokenToNumber(iter.cur()!);
            iter.next();

            if (iter.isInBound() && isTokenNumber(iter.cur()!)) throwSyntax(iter, "Exponents cannot have more than 2 numbers");
        }

        exp *= sign;
    }

    if (iter.isInBound() && iter.cur()!.type === literalTokenTypes.dot)
        throwSyntax(iter, "Dot is not allowed in exponent or after another dot");
    if (iter.isInBound() && iter.cur()!.type === literalTokenTypes.exp)
        throwSyntax(iter, "Literal cannot have more than one Exp");

    iter.prev();
    return significand * Math.pow(10, exp);
}

/**
 * returns whether to propagate further in the stack
 */
type Command = (st: EvalStacks, pre: Precedence, throwSyntax: (message: string) => never, throwMath: (message: string) => never) => boolean;
type CommandStackElement = {
    tokenType: TokenType | null,
    cmd: Command
};
type CommandStack = CommandStackElement[];
type NumericStack = number[];

function unaryCommand(cmdPrecedence: Precedence, fn: (throwSyntax: ThrowMsg, throwMath: ThrowMsg, x: number) => number): Command {
    return (st, pre, throwSyntax, throwMath) => {
        if (pre > cmdPrecedence) return false;
        if (st.numeric.length === 0) throw new Error("Unary command expects at least one element in the numeric stack");
        st.numeric.push(fn(throwSyntax, throwMath, st.numeric.pop()!));
        st.command.pop();
        return true;
    };
}
function binaryCommand(cmdPrecedence: Precedence, fn: (throwSyntax: ThrowMsg, throwMath: ThrowMsg, left: number, right: number) => number): Command {
    return (st, pre, throwSyntax, throwMath) => {
        if (pre > cmdPrecedence) return false;
        if (st.numeric.length < 2) throw new Error("Binary command expects >=2 elemens in the numeric stack");
        const right = st.numeric.pop()!;
        const left = st.numeric.pop()!;
        st.numeric.push(fn(throwSyntax, throwMath, left, right));
        st.command.pop();
        return true;
    };
}


class EvalStacks {
    command: CommandStack = [];
    numeric: NumericStack = [];

    constructor() {}

    evalUntil(errorIter: TokenIterator, precedence: Precedence) {
        while (this.command.length !== 0 && this.command.at(-1)!.cmd(
            this,
            precedence,
            (msg) => throwSyntax(errorIter, msg),
            (msg) => throwMath(errorIter, msg),
        ));
    }
}

function evaluateExpression(tokens: Token[]) {
    const evalStacks = new EvalStacks();

    let expectNumber = true;
    const iter = new TokenIterator(tokens);
    for (; iter.isInBound(); iter.next()) {
        const cur = iter.cur()!;
        if (Object.values(literalTokenTypes).includes(cur.type)) {
            if (!expectNumber) throwSyntax(iter, "Unexpected number");
            const value = acceptLiteral(iter);
            evalStacks.numeric.push(value);
            expectNumber = false;

        } else if (cur.type === allTokenTypes.deg) {
            if (expectNumber) throwSyntax(iter, "Expect number but found degree");
            evalStacks.evalUntil(iter, Precedence.L11);

            /**
             * returns whether to continue accepting
             */
            function acceptOnePart(): boolean {
                iter.next();
                if (!(iter.isInBound())) {
                    iter.prev();
                    evalStacks.evalUntil(iter, Precedence.L11);
                    return false;
                }
                if (iter.cur()!.type === allTokenTypes.deg) throwSyntax(iter, "Not allowed two consecutive degree");
                if (!Object.values(literalTokenTypes).includes(iter.cur()!.type)) {
                    iter.prev();
                    evalStacks.evalUntil(iter, Precedence.L11);
                    return false;
                }

                evalStacks.command.push({
                    tokenType: allTokenTypes.deg,
                    cmd: (st, _, __, ___) => {
                        st.command.pop();
                        if (st.numeric.length < 2) throw new Error("Degree command expects >=2 elements in the numeric stack");
                        const last = st.numeric.pop()!;
                        const first = st.numeric.pop()!;
                        st.numeric.push(first + last/60);
                        return true;
                    },
                });

                const value = acceptLiteral(iter);
                evalStacks.numeric.push(value);
                iter.next();
                if (!(iter.isInBound() && iter.cur()!.type === allTokenTypes.deg))
                    throwSyntax(iter, "Expect degree symbol after degree then number literal");

                return true;
            }

            if (!acceptOnePart()) continue;
            if (!acceptOnePart()) continue;

            iter.next();
            if (iter.isInBound() && Object.values(literalTokenTypes).includes(iter.cur()!.type))
                throwSyntax(iter, "Number literal cannot exist after a maximum of 3 degree symbols");
            if (iter.isInBound() && iter.cur()!.type === allTokenTypes.deg) throwSyntax(iter, "Not allowed two consecutive degree");
            iter.prev();
            evalStacks.evalUntil(iter, Precedence.L11);

            expectNumber = false;

        } else if (cur.type instanceof ValuedTokenType) {
            if (!expectNumber) {
                evalStacks.evalUntil(iter, Precedence.L7);
                evalStacks.command.push({
                    tokenType: null,
                    cmd: binaryCommand(Precedence.L7, (_, __, l, r) => l*r),
                });
            }
            evalStacks.numeric.push(cur.type.fn());
            expectNumber = false;

        } else if (cur.type === allTokenTypes.plus) {
            if (expectNumber) {
                // nothing happens: more than 24 + does not cause STACK error
                expectNumber = true;
            } else {
                evalStacks.evalUntil(iter, Precedence.L4);
                evalStacks.command.push({
                    tokenType: allTokenTypes.plus,
                    cmd: binaryCommand(Precedence.L4, (_, __, left, right) => left + right),
                });
                expectNumber = true;
            }

        } else if (cur.type === allTokenTypes.minus || cur.type === allTokenTypes.neg) {
            if (expectNumber) {
                evalStacks.evalUntil(iter, Precedence.L9);
                evalStacks.command.push({
                    tokenType: allTokenTypes.neg,
                    cmd: unaryCommand(Precedence.L9, (_, __, x) => -x),
                });
                expectNumber = true;
            } else {
                if (cur.type === allTokenTypes.neg) throwSyntax(iter, "Negative sign cannot follow a number");
                evalStacks.evalUntil(iter, Precedence.L4);
                evalStacks.command.push({
                    tokenType: allTokenTypes.minus,
                    cmd: binaryCommand(Precedence.L4, (_, __, left, right) => left - right),
                });
                expectNumber = true;
            }

        } else if (cur.type === allTokenTypes.multiply || cur.type === allTokenTypes.divide) {
            if (expectNumber) throwSyntax(iter, "Expect number but found multiply or divide instead");
            evalStacks.evalUntil(iter, Precedence.L5);
            const fn: (_: ThrowMsg, throwMath: ThrowMsg, left: number, right: number) => number = (() => {
                if (cur.type === allTokenTypes.multiply)
                    return (_: ThrowMsg, __: ThrowMsg, l: number, r: number) => l*r;
                else
                    return (_: ThrowMsg, throwMath: ThrowMsg, l: number, r: number) => {
                        if (r === 0) throwMath("Division by 0");
                        return l/r;
                    };
            })();
            evalStacks.command.push({
                tokenType: cur.type,
                cmd: binaryCommand(Precedence.L5, fn),
            });
            expectNumber = true;

        } else if (cur.type === allTokenTypes.permutation || cur.type === allTokenTypes.combination) {
            if (expectNumber) throwSyntax(iter, "Expect number but found permutation or combination instead");
            evalStacks.evalUntil(iter, Precedence.L6);
            const isComb = cur.type === allTokenTypes.combination;
            evalStacks.command.push({
                tokenType: cur.type,
                cmd: binaryCommand(Precedence.L6, (_, throwMath: ThrowMsg, n: number, r: number) => {
                    if (!Number.isInteger(n) || !Number.isInteger(r)) throwMath("n and r in nPr must be integer");
                    if (!(0 <= r)) throwMath("r cannot be negative in nPr");
                    if (!(r <= n)) throwMath("n must be no less than r in nPr");
                    if (!(n < Math.pow(10, 10))) throwMath("n must be less than 10^10 in nPr");

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
            if (expectNumber) throwSyntax(iter, "Expect number but found frac instead");
            evalStacks.evalUntil(iter, Precedence.L10);
            if (evalStacks.command.length > 0 && evalStacks.command.at(-1)!.tokenType === allTokenTypes.frac) {
                if (evalStacks.command.length > 1 && evalStacks.command.at(-2)!.tokenType === allTokenTypes.frac) throwSyntax(iter, "3 Frac not allowed");
                evalStacks.command.push({
                    tokenType: cur.type,
                    cmd: (st, pre, _, throwMath) => {
                        if (pre === Precedence.L10) throw new Error("what? i thought 3 fracs are thrown already");
                        // Later frac evaluates first, then negative sign (L8), then this frac
                        if (pre >= Precedence.L9) return false;
                        if (st.numeric.length < 3) throw new Error("Second frac command expects >=3 elements in the numeric stack");
                        st.command.pop();
                        st.command.pop();
                        const den = st.numeric.pop()!;
                        const num = st.numeric.pop()!;
                        const int = st.numeric.pop()!;
                        if (den === 0) throwMath("Division by 0");
                        if (num === 0) st.numeric.push(int);
                        else if (int === 0) st.numeric.push(num/den);
                        else {
                            const sign = Math.sign(den) * Math.sign(num) * Math.sign(int);
                            const magnitude = Math.abs(int) + Math.abs(num) / Math.abs(den);
                            st.numeric.push(sign * magnitude);
                        }
                        return true;
                    },
                });
            } else {
                evalStacks.command.push({
                    tokenType: cur.type,
                    cmd: (st, pre, _, throwMath) => {
                        // If another frac appears later (L9), this should not evaluate
                        // Later frac evaluates first, then negative sign (L8), then this frac
                        if (pre >= Precedence.L9) return false;
                        if (st.numeric.length < 2) throw new Error("Frac command expects >=2 elemens in the numeric stack");
                        const den = st.numeric.pop()!;
                        const num = st.numeric.pop()!;
                        if (den === 0) throwMath("Division by 0");
                        st.numeric.push(num / den);
                        st.command.pop();
                        return true;
                    },
                });
            }
            expectNumber = true;

        } else if (cur.type instanceof SuffixFuncTokenType) {
            if (expectNumber) throwSyntax(iter, "Expect number but found suffix function instead");
            const fn = (cur.type as SuffixFuncTokenType).fn;
            evalStacks.command.push({
                tokenType: cur.type,
                cmd: (st, pre, _, throwMath) => {
                    if (pre > Precedence.L11) return false; // delete this?
                    if (st.numeric.length === 0) throw new Error("Suffix function command expects >=1 elements in the numeric stack");
                    const x = st.numeric.pop()!;
                    st.numeric.push(fn(throwMath, x));
                    st.command.pop();
                    return true;
                },
            });
            evalStacks.evalUntil(iter, Precedence.L11);
            expectNumber = false;

        } else if (cur.type instanceof ParenFuncTokenType) {
            if (!expectNumber) {
                evalStacks.evalUntil(iter, Precedence.L7);
                evalStacks.command.push({
                    tokenType: null,
                    cmd: binaryCommand(Precedence.L7, (_, __, l, r) => l*r),
                });
            }
            const oriNSLen = evalStacks.numeric.length;
            const argNum = cur.type.argNum;
            const maxArgNum = (typeof argNum === "number") ? argNum : Math.max(...argNum);
            const fn = cur.type.fn;
            evalStacks.command.push({
                tokenType: cur.type,
                cmd: (st, pre, throwSyntax, throwMath) => {
                    if (pre !== Precedence.comma && pre !== Precedence.closeBracket && pre !== Precedence.lowest) return false;

                    const curArgNum = st.numeric.length - oriNSLen;
                    if (pre === Precedence.comma && curArgNum !== maxArgNum) return false;

                    const isArgNumAcceptable = (typeof argNum === "number") ? (curArgNum === argNum) : argNum.includes(curArgNum);
                    if ((pre === Precedence.closeBracket || Precedence.lowest) && !isArgNumAcceptable)
                        throwSyntax("Incorrect number of parenthetical function arguments");

                    const args: number[] = [];
                    for (let argI = 0; argI < curArgNum; ++argI) {
                        args.push(st.numeric.pop()!);
                    }
                    args.reverse();

                    st.numeric.push(fn(throwMath, ...args));
                    st.command.pop();

                    if (pre === Precedence.closeBracket) return false;

                    return true;
                },
            });
            expectNumber = true;
        } else if (cur.type === allTokenTypes.comma) {
            if (expectNumber) throwSyntax(iter, "Expect number but found comma instead");
            evalStacks.evalUntil(iter, Precedence.comma);
            if (evalStacks.command.length === 0 || !(evalStacks.command.at(-1)!.tokenType instanceof ParenFuncTokenType))
                throwSyntax(iter, "Found comma at top level");
            expectNumber = true;
        } else if (cur.type === allTokenTypes.closeBracket) {
            if (expectNumber) throwSyntax(iter, "Expect number but found close bracket instead");
            if (!evalStacks.command.some((cmdEl) => cmdEl.tokenType instanceof ParenFuncTokenType)) throwSyntax(iter, "Found close bracket at top level");
            evalStacks.evalUntil(iter, Precedence.closeBracket);
            expectNumber = false;
        } else {
            throw new Error("not supported token");
        }

        console.log(evalStacks.numeric, evalStacks.command);
    }
    if (expectNumber) {
        throwSyntax(iter, "Expect number");
    }
    evalStacks.evalUntil(iter, Precedence.lowest);

    return evalStacks;
}
