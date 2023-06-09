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

class StackOverflowError<T> extends Error {
    constructor(
        public target: LengthLimitedStack<T>,
        message?: string | undefined,
    ) {
        super(message);
        this.name = "StackOverflowError";
    }
}

class StackEmptyError<T> extends Error {
    constructor(
        public target: LengthLimitedStack<T>,
        message?: string | undefined,
    ) {
        super(message);
        this.name = "StackEmptyError";
    }
}

class LengthLimitedStack<T> {
    constructor(private lenLimit: number) {}

    _raw: T[] = [];
    get raw() { return this._raw; }
    set raw(val) {
        if (val.length > this.lenLimit) throw new StackOverflowError(this);
        this._raw = val;
    }

    get length() { return this.raw.length; }
    get isEmpty() { return this.length === 0; }

    push(item: T): void {
        if (this.length === this.lenLimit) throw new StackOverflowError(this);
        this.raw.push(item);
    }
    pop(): T {
        if (this.isEmpty) throw new StackEmptyError(this);
        return this.raw.pop()!;
    }

    get last(): T {
        if (this.isEmpty) throw new StackEmptyError(this);
        return this.raw.at(-1)!;
    }
}

/**
 * returns whether to propagate further in the stack
 */
type Command = (st: EvalStacks, pre: Precedence, throwSyntax: (message: string) => never, throwMath: (message: string) => never) => boolean;
type CommandStackElement = {
    tokenType: TokenType | null,
    cmd: Command
};

function unaryCommand(cmdPrecedence: Precedence, fn: (throwSyntax: ThrowMsg, throwMath: ThrowMsg, x: number) => number): Command {
    return (st, pre, throwSyntax, throwMath) => {
        if (pre > cmdPrecedence) return false;
        if (st.numeric.length === 0) throw new Error("Unary command expects at least one element in the numeric stack");
        st.numeric.push(fn(throwSyntax, throwMath, st.numeric.popNumber()));
        st.command.pop();
        return true;
    };
}
type BinaryFunction = (throwSyntax: ThrowMsg, throwMath: ThrowMsg, left: number, right: number) => number;
function binaryCommand(cmdPrecedence: Precedence, fn: BinaryFunction): Command {
    return (st, pre, throwSyntax, throwMath) => {
        if (pre > cmdPrecedence) return false;
        if (st.numeric.length < 2) throw new Error("Binary command expects >=2 elemens in the numeric stack");
        const right = st.numeric.popNumber();
        const left = st.numeric.popNumber();
        st.numeric.push(fn(throwSyntax, throwMath, left, right));
        st.command.pop();
        return true;
    };
}

class CommandStack extends LengthLimitedStack<CommandStackElement> {
    static readonly SIZE = 24;
    constructor() {
        super(CommandStack.SIZE);
    }
}
/** Placeholder means we expect a number. */
class NumericStack extends LengthLimitedStack<number | typeof NumericStack.PLACEHOLDER> {
    static readonly PLACEHOLDER = Symbol("NumericStack.PLACEHOLDER");

    static readonly SIZE = 11;
    constructor() {
        super(NumericStack.SIZE);
    }

    popPlaceholder(): void {
        if (this.pop() !== NumericStack.PLACEHOLDER) throw new Error("Popping placeholder but found number instead");
    }
    popNumber(): number {
        const x = this.pop();
        if (x === NumericStack.PLACEHOLDER) throw new Error("Popping number but found placeholder");
        return x;
    }

    pushPlaceholder(): void {
        this.push(NumericStack.PLACEHOLDER);
    }

    replacePlaceholder(x: number): void {
        this.popPlaceholder();
        this.push(x);
    }

    isPlaceholder(): boolean {
        return this.last === NumericStack.PLACEHOLDER;
    }
}

class EvalStacks {
    command = new CommandStack();
    numeric = new NumericStack();

    constructor() {}

    evalUntil(errorIter: TokenIterator, precedence: Precedence) {
        while (this.command.length !== 0 && this.command.last.cmd(
            this,
            precedence,
            (msg) => throwSyntax(errorIter, msg),
            (msg) => throwMath(errorIter, msg),
        ));
    }
}

// Helper functions
function handleInfixOperator(evalStacks: EvalStacks, iter: TokenIterator, tokenType: TokenType, pre: Precedence, fn: BinaryFunction) {
    if (evalStacks.numeric.isPlaceholder()) throwSyntax(iter, "Expect number but found an infix operator instead");
    evalStacks.evalUntil(iter, pre);
    evalStacks.command.push({
        tokenType: tokenType,
        cmd: binaryCommand(pre, fn),
    });
    evalStacks.numeric.pushPlaceholder();
}

function insertOmittedMul(evalStacks: EvalStacks, iter: TokenIterator) {
    if (evalStacks.numeric.isPlaceholder()) {
        evalStacks.numeric.popPlaceholder();
    } else {
        evalStacks.evalUntil(iter, Precedence.L7);
        evalStacks.command.push({
            tokenType: null,
            cmd: binaryCommand(Precedence.L7, (_, __, l, r) => l*r),
        });
    }
}

// Literal
function meetLiteralToken(evalStacks: EvalStacks, iter: TokenIterator) {
    if (!evalStacks.numeric.isPlaceholder()) throwSyntax(iter, "Unexpected number");
    evalStacks.numeric.popPlaceholder();

    const value = acceptLiteral(iter);
    evalStacks.numeric.push(value);
}

// Degree
function meetDegreeToken(evalStacks: EvalStacks, iter: TokenIterator) {
    if (evalStacks.numeric.isPlaceholder()) throwSyntax(iter, "Expect number but found degree");
    evalStacks.evalUntil(iter, Precedence.L11);

    /**
     * returns whether to continue accepting
     */
    function acceptOnePart(): boolean {
        iter.next();
        if (!iter.isInBound()) {
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

        iter.prev();
        evalStacks.numeric.pushPlaceholder();
        evalStacks.command.push({
            tokenType: allTokenTypes.deg,
            cmd: (st, _, __, ___) => {
                st.command.pop();
                if (st.numeric.length < 2) throw new Error("Degree command expects >=2 elements in the numeric stack");
                const last = st.numeric.popNumber();
                const first = st.numeric.popNumber();
                st.numeric.push(first + last/60);
                return true;
            },
        });

        iter.next();

        const value = acceptLiteral(iter);
        evalStacks.numeric.replacePlaceholder(value);
        iter.next();
        if (!(iter.isInBound() && iter.cur()!.type === allTokenTypes.deg))
            throwSyntax(iter, "Expect degree symbol after degree then number literal");

        return true;
    }

    if (!acceptOnePart()) return;
    if (!acceptOnePart()) return;

    iter.next();
    if (iter.isInBound() && Object.values(literalTokenTypes).includes(iter.cur()!.type))
        throwSyntax(iter, "Number literal cannot exist after a maximum of 3 degree symbols");
    if (iter.isInBound() && iter.cur()!.type === allTokenTypes.deg) throwSyntax(iter, "Not allowed two consecutive degree");
    iter.prev();
    evalStacks.evalUntil(iter, Precedence.L11);
}

// Valued
function meetValuedToken(evalStacks: EvalStacks, iter: TokenIterator, tokenType: ValuedTokenType) {
    insertOmittedMul(evalStacks, iter);
    evalStacks.numeric.push(tokenType.fn());
}

// Plus, minus and negative
function meetPlusToken(evalStacks: EvalStacks, iter: TokenIterator) {
    if (evalStacks.numeric.isPlaceholder()) {
        // nothing happens: more than 24 + does not cause STACK error
    } else {
        handleInfixOperator(evalStacks, iter, allTokenTypes.plus, Precedence.L4, (_, __, left, right) => left + right);
    }
}
function meetPrefixMinus(evalStacks: EvalStacks, _: TokenIterator) {
    evalStacks.command.push({
        tokenType: allTokenTypes.neg,
        cmd: unaryCommand(Precedence.L9, (_, __, x) => -x),
    });
}
function meetInfixMinus(evalStacks: EvalStacks, iter: TokenIterator) {
    handleInfixOperator(evalStacks, iter, allTokenTypes.minus, Precedence.L4, (_, __, left, right) => left - right);
}
function meetMinusToken(evalStacks: EvalStacks, iter: TokenIterator) {
    if (evalStacks.numeric.isPlaceholder()) {
        meetPrefixMinus(evalStacks, iter);
    } else {
        meetInfixMinus(evalStacks, iter);
    }
}
function meetNegToken(evalStacks: EvalStacks, iter: TokenIterator) {
    if (!evalStacks.numeric.isPlaceholder()) throwSyntax(iter, "Negative sign cannot follow a number (ommitted multiplication excludes negative sign)");
    meetPrefixMinus(evalStacks, iter);
}

// Multiply and divide
function meetMultiplyToken(evalStacks: EvalStacks, iter: TokenIterator) {
    handleInfixOperator(evalStacks, iter, allTokenTypes.multiply, Precedence.L5, (_, __, l, r) => l*r);
}
function meetDivideToken(evalStacks: EvalStacks, iter: TokenIterator) {
    handleInfixOperator(evalStacks, iter, allTokenTypes.divide, Precedence.L5, (_, throwMath, l, r) => {
        if (r === 0) throwMath("Division by 0");
        return l/r;
    });
}

// Permutation and combination
function validatePerComArguments(n: number, r: number, throwMath: (msg: string) => void) {
    if (!Number.isInteger(n) || !Number.isInteger(r)) throwMath("n and r in nPr must be integer");
    if (!(0 <= r)) throwMath("r cannot be negative in nPr");
    if (!(r <= n)) throwMath("n must be no less than r in nPr");
    if (!(n < Math.pow(10, 10))) throwMath("n must be less than 10^10 in nPr");
}
function meetPermutationToken(evalStacks: EvalStacks, iter: TokenIterator) {
    handleInfixOperator(evalStacks, iter, allTokenTypes.permutation, Precedence.L6, (_, throwMath: ThrowMsg, n: number, r: number) => {
        validatePerComArguments(n, r, throwMath);

        let ans = 1;
        for (let k = 0; k < r; ++k) {
            ans *= n-k;
        }
        return ans;
    });
}
function meetCombinationToken(evalStacks: EvalStacks, iter: TokenIterator) {
    handleInfixOperator(evalStacks, iter, allTokenTypes.permutation, Precedence.L6, (_, throwMath: ThrowMsg, n: number, r: number) => {
        validatePerComArguments(n, r, throwMath);

        let ans = 1;
        for (let k = 0; k < r; ++k) {
            ans = ans * (n-k) / (k+1);
        }
        return ans;
    });
}

// Fraction
function meetFractionToken(evalStacks: EvalStacks, iter: TokenIterator) {
    if (evalStacks.numeric.isPlaceholder()) throwSyntax(iter, "Expect number but found frac instead");
    evalStacks.evalUntil(iter, Precedence.L10);
    if (evalStacks.command.length > 0 && evalStacks.command.last.tokenType === allTokenTypes.frac) {
        if (evalStacks.command.length > 1 && evalStacks.command.raw.at(-2)!.tokenType === allTokenTypes.frac) throwSyntax(iter, "3 Frac not allowed");
        evalStacks.command.push({
            tokenType: allTokenTypes.frac,
            cmd: (st, pre, _, throwMath) => {
                if (pre === Precedence.L10) throw new Error("what? i thought 3 fracs are thrown already");
                // Later frac evaluates first, then negative sign (L8), then this frac
                if (pre >= Precedence.L9) return false;
                if (st.numeric.length < 3) throw new Error("Second frac command expects >=3 elements in the numeric stack");
                st.command.pop();
                st.command.pop();
                const den = st.numeric.popNumber();
                const num = st.numeric.popNumber();
                const int = st.numeric.popNumber();
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
            tokenType: allTokenTypes.frac,
            cmd: (st, pre, _, throwMath) => {
                // If another frac appears later (L9), this should not evaluate
                // Later frac evaluates first, then negative sign (L8), then this frac
                if (pre >= Precedence.L9) return false;
                if (st.numeric.length < 2) throw new Error("Frac command expects >=2 elemens in the numeric stack");
                const den = st.numeric.popNumber();
                const num = st.numeric.popNumber();
                if (den === 0) throwMath("Division by 0");
                st.numeric.push(num / den);
                st.command.pop();
                return true;
            },
        });
    }
    evalStacks.numeric.pushPlaceholder();
}

// Suffix function
function meetSuffixFuncToken(evalStacks: EvalStacks, iter: TokenIterator, tokenType: SuffixFuncTokenType) {
    if (evalStacks.numeric.isPlaceholder()) throwSyntax(iter, "Expect number but found suffix function instead");
    const fn = tokenType.fn;
    evalStacks.evalUntil(iter, Precedence.L11);

    if (evalStacks.numeric.length === 0) throw new Error("Suffix function expects >=1 elements in the numeric stack");
    const x = evalStacks.numeric.popNumber();
    evalStacks.numeric.push(fn((msg) => throwMath(iter, msg), x));
}

// Parerenthical function
function meetParenFuncToken(evalStacks: EvalStacks, iter: TokenIterator, tokenType: ParenFuncTokenType) {
    insertOmittedMul(evalStacks, iter);
    const oriNSLen = evalStacks.numeric.length;
    const argNum = tokenType.argNum;
    const maxArgNum = (typeof argNum === "number") ? argNum : Math.max(...argNum);
    const fn = tokenType.fn;
    evalStacks.command.push({
        tokenType: tokenType,
        cmd: (st, pre, throwSyntax, throwMath) => {
            if (pre !== Precedence.comma && pre !== Precedence.closeBracket && pre !== Precedence.lowest) return false;

            const curArgNum = st.numeric.length - oriNSLen;
            if (pre === Precedence.comma && curArgNum !== maxArgNum) return false;

            const isArgNumAcceptable = (typeof argNum === "number") ? (curArgNum === argNum) : argNum.includes(curArgNum);
            if ((pre === Precedence.closeBracket || Precedence.lowest) && !isArgNumAcceptable)
                throwSyntax("Incorrect number of parenthetical function arguments");

            const args: number[] = [];
            for (let argI = 0; argI < curArgNum; ++argI) {
                args.push(st.numeric.popNumber());
            }
            args.reverse();

            st.numeric.push(fn(throwMath, ...args));
            st.command.pop();

            if (pre === Precedence.closeBracket) return false;

            return true;
        },
    });
    evalStacks.numeric.pushPlaceholder();
}
function meetCommaToken(evalStacks: EvalStacks, iter: TokenIterator) {
    if (evalStacks.numeric.isPlaceholder()) throwSyntax(iter, "Expect number but found comma instead");
    evalStacks.evalUntil(iter, Precedence.comma);
    if (evalStacks.command.length === 0 || !(evalStacks.command.last.tokenType instanceof ParenFuncTokenType))
        throwSyntax(iter, "Found comma at top level");
    evalStacks.numeric.pushPlaceholder();
}
function meetCloseBracketToken(evalStacks: EvalStacks, iter: TokenIterator) {
    if (evalStacks.numeric.isPlaceholder()) throwSyntax(iter, "Expect number but found close bracket instead");
    if (!evalStacks.command.raw.some((cmdEl) => cmdEl.tokenType instanceof ParenFuncTokenType)) throwSyntax(iter, "Found close bracket at top level");
    evalStacks.evalUntil(iter, Precedence.closeBracket);
}

// Main function to evaluate expression
function evaluateExpression(tokens: Token[]) {
    const evalStacks = new EvalStacks();

    evalStacks.numeric.pushPlaceholder();

    const iter = new TokenIterator(tokens);

    try {
        for (; iter.isInBound(); iter.next()) {
            const cur = iter.cur()!;
            switch (cur.type) {
                case allTokenTypes.deg:
                    meetDegreeToken(evalStacks, iter);
                    break;
                case allTokenTypes.plus:
                    meetPlusToken(evalStacks, iter);
                    break;
                case allTokenTypes.minus:
                    meetMinusToken(evalStacks, iter);
                    break;
                case allTokenTypes.neg:
                    meetNegToken(evalStacks, iter);
                    break;
                case allTokenTypes.multiply:
                    meetMultiplyToken(evalStacks, iter);
                    break;
                case allTokenTypes.divide:
                    meetDivideToken(evalStacks, iter);
                    break;
                case allTokenTypes.permutation:
                    meetPermutationToken(evalStacks, iter);
                    break;
                case allTokenTypes.combination:
                    meetCombinationToken(evalStacks, iter);
                    break;
                case allTokenTypes.frac:
                    meetFractionToken(evalStacks, iter);
                    break;
                case allTokenTypes.comma:
                    meetCommaToken(evalStacks, iter);
                    break;
                case allTokenTypes.closeBracket:
                    meetCloseBracketToken(evalStacks, iter);
                    break;

                default:
                    if (Object.values(literalTokenTypes).includes(cur.type)) {
                        meetLiteralToken(evalStacks, iter);
                    } else if (cur.type instanceof ValuedTokenType) {
                        meetValuedToken(evalStacks, iter, cur.type);
                    } else if (cur.type instanceof SuffixFuncTokenType) {
                        meetSuffixFuncToken(evalStacks, iter, cur.type);
                    } else if (cur.type instanceof ParenFuncTokenType) {
                        meetParenFuncToken(evalStacks, iter, cur.type);
                    } else {
                        throw new Error("not supported token");
                    }
            }

            // console.log(evalStacks.numeric, evalStacks.command);
        }
        if (evalStacks.numeric.isPlaceholder()) {
            throwSyntax(iter, "Expect number");
        }
        evalStacks.evalUntil(iter, Precedence.lowest);

        if (evalStacks.command.length !== 0) throw new Error("Expect the command stack to be empty after eval until lowest precedence");
        if (evalStacks.numeric.length !== 1) throw new Error("Expect the numeric stack to have exactly one element after eval until lowest precedence");

        return evalStacks.numeric.popNumber();
    } catch (err) {
        if (err instanceof StackOverflowError) {
            const pos = iter.isInBound() ? iter.cur()!.sourceStart : iter.last()!.sourceEnd;
            throw new RuntimeStackError(pos, iter.i, `The ${err.target === evalStacks.numeric ? "numeric" : "command"} stack overflows`);
        } else throw err;
    }
}
