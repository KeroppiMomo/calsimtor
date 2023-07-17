function throwRuntime(ErrorClass: typeof RuntimeError, iter: TokenIterator, failedMessage: string): never {
    const pos = iter.isInBound() ? iter.cur()!.sourceStart : iter.last()!.sourceEnd;
    throw new ErrorClass(pos, iter.i, failedMessage);
}
type ThrowLocalRuntime = (ErrorClass: typeof RuntimeError, failedMessage: string) => never;

enum Precedence {
    lowest = -999,
    comma = -2,
    closeBracket = -1, // don't really know if the order matters
    L1 = 1, //
    L2,
    /** Precedence of =, <>, <, >, <=, >= */
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
    /** Precedence of suffix functions, power, root */
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

        if (!(iter.isInBound() && isTokenNumber(iter.cur()!))) throwRuntime(RuntimeSyntaxError, iter, "Missing number after exp");
        exp = tokenToNumber(iter.cur()!);
        iter.next();

        if (iter.isInBound() && isTokenNumber(iter.cur()!)) {
            exp = exp * 10 + tokenToNumber(iter.cur()!);
            iter.next();

            if (iter.isInBound() && isTokenNumber(iter.cur()!)) throwRuntime(RuntimeSyntaxError, iter, "Exponents cannot have more than 2 numbers");
        }

        exp *= sign;
    }

    if (iter.isInBound() && iter.cur()!.type === literalTokenTypes.dot)
        throwRuntime(RuntimeSyntaxError, iter, "Dot is not allowed in exponent or after another dot");
    if (iter.isInBound() && iter.cur()!.type === literalTokenTypes.exp)
        throwRuntime(RuntimeSyntaxError, iter, "Literal cannot have more than one Exp");

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

type EvalContext = {
    evalStacks: EvalStacks,
    iter: TokenIterator,
    context: Context,
};

/**
 * returns whether to propagate further in the stack
 */
type Command = (evalContext: EvalContext, pre: Precedence, throwRuntime: ThrowLocalRuntime) => boolean;
type CommandStackElement = {
    tokenType: TokenType | null,
    cmd: Command
};

type UnaryFunction = (x: number, throwRuntime: ThrowLocalRuntime, context: Context) => number;
function unaryCommand(cmdPrecedence: Precedence, fn: UnaryFunction): Command {
    return ({ evalStacks: st, context }: EvalContext, pre: Precedence, throwRuntime: ThrowLocalRuntime) => {
        if (pre > cmdPrecedence) return false;
        if (st.numeric.length === 0) throw new Error("Unary command expects at least one element in the numeric stack");
        st.numeric.push(fn(st.numeric.popNumber(), throwRuntime, context));
        st.command.pop();
        return true;
    };
}
type BinaryFunction = (left: number, right: number, throwRuntime: ThrowLocalRuntime, context: Context) => number;
function binaryCommand(cmdPrecedence: Precedence, fn: BinaryFunction): Command {
    return ({ evalStacks: st, context }: EvalContext, pre: Precedence, throwRuntime: ThrowLocalRuntime) => {
        if (pre > cmdPrecedence) return false;
        if (st.numeric.length < 2) throw new Error("Binary command expects >=2 elemens in the numeric stack");
        const right = st.numeric.popNumber();
        const left = st.numeric.popNumber();
        st.numeric.push(fn(left, right, throwRuntime, context));
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

    evalUntil({ evalStacks, iter, context }: EvalContext, precedence: Precedence) {
        while (this.command.length !== 0 && this.command.last.cmd(
            { evalStacks, iter, context },
            precedence,
            (ErrorClass, msg) => throwRuntime(ErrorClass, iter, msg),
        ));
    }
}

// Helper functions
function handleInfixOperator(evalContext: EvalContext, tokenType: TokenType, pre: Precedence, fn: InfixFunc) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found an infix operator instead");
    evalStacks.evalUntil(evalContext, pre);
    evalStacks.command.push({
        tokenType: tokenType,
        cmd: binaryCommand(
            pre,
            (l, r, throwRuntime, context) => fn((msg) => throwRuntime(RuntimeMathError, msg), context, l, r)
        ),
    });
    evalStacks.numeric.pushPlaceholder();
}

function insertOmittedMul(evalContext: EvalContext) {
    const { evalStacks } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) {
        evalStacks.numeric.popPlaceholder();
    } else {
        evalStacks.evalUntil(evalContext, Precedence.L7);
        evalStacks.command.push({
            tokenType: null,
            cmd: binaryCommand(Precedence.L7, (l, r) => l*r),
        });
    }
}

// Literal
function meetLiteralToken({ evalStacks, iter }: EvalContext) {
    if (!evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Unexpected number");
    evalStacks.numeric.popPlaceholder();

    const value = acceptLiteral(iter);
    evalStacks.numeric.push(value);
}

// Degree
function meetDegreeToken(evalContext: EvalContext) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found degree");
    evalStacks.evalUntil(evalContext, Precedence.L11);

    /**
     * returns whether to continue accepting
     */
    function acceptOnePart(): boolean {
        iter.next();
        if (!iter.isInBound()) {
            iter.prev();
            evalStacks.evalUntil(evalContext, Precedence.L11);
            return false;
        }
        if (iter.cur()!.type === allTokenTypes.deg) throwRuntime(RuntimeSyntaxError, iter, "Not allowed two consecutive degree");
        if (!Object.values(literalTokenTypes).includes(iter.cur()!.type)) {
            iter.prev();
            evalStacks.evalUntil(evalContext, Precedence.L11);
            return false;
        }

        iter.prev();
        evalStacks.numeric.pushPlaceholder();
        evalStacks.command.push({
            tokenType: allTokenTypes.deg,
            cmd: ({ evalStacks: st }) => {
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
            throwRuntime(RuntimeSyntaxError, iter, "Expect degree symbol after degree then number literal");

        return true;
    }

    if (!acceptOnePart()) return;
    if (!acceptOnePart()) return;

    iter.next();
    if (iter.isInBound() && Object.values(literalTokenTypes).includes(iter.cur()!.type))
        throwRuntime(RuntimeSyntaxError, iter, "Number literal cannot exist after a maximum of 3 degree symbols");
    if (iter.isInBound() && iter.cur()!.type === allTokenTypes.deg) throwRuntime(RuntimeSyntaxError, iter, "Not allowed two consecutive degree");
    iter.prev();
    evalStacks.evalUntil(evalContext, Precedence.L11);
}

// Valued
function meetValuedToken({ evalStacks, iter, context }: EvalContext, tokenType: ValuedTokenType) {
    insertOmittedMul({ evalStacks, iter, context });
    evalStacks.numeric.push(tokenType.fn(context));
}

// Plus, minus and negative
function meetPlusToken({ evalStacks, iter, context }: EvalContext) {
    if (evalStacks.numeric.isPlaceholder()) {
        // nothing happens: more than 24 + does not cause STACK error
    } else {
        handleInfixOperator({ evalStacks, iter, context }, allTokenTypes.plus, Precedence.L4, (_, __, l, r) => l + r);
    }
}
function meetPrefixMinus({ evalStacks }: EvalContext) {
    evalStacks.command.push({
        tokenType: allTokenTypes.neg,
        cmd: unaryCommand(Precedence.L9, (x) => -x),
    });
}
function meetInfixMinus(evalContext: EvalContext) {
    handleInfixOperator(evalContext, allTokenTypes.minus, Precedence.L4, (_, __, l, r) => l - r);
}
function meetMinusToken({ evalStacks, iter, context }: EvalContext) {
    if (evalStacks.numeric.isPlaceholder()) {
        meetPrefixMinus({ evalStacks, iter, context });
    } else {
        meetInfixMinus({ evalStacks, iter, context });
    }
}
function meetNegToken({ evalStacks, iter, context }: EvalContext) {
    if (!evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Negative sign cannot follow a number (ommitted multiplication excludes negative sign)");
    meetPrefixMinus({ evalStacks, iter, context });
}

// Multiply and divide
function meetMultiplyToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, allTokenTypes.multiply, Precedence.L5, allTokenTypes.multiply.fn);
}
function meetDivideToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, allTokenTypes.divide, Precedence.L5, allTokenTypes.divide.fn);
}

// Permutation and combination
function meetPermutationToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, allTokenTypes.permutation, Precedence.L6, allTokenTypes.permutation.fn);
}
function meetCombinationToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, allTokenTypes.permutation, Precedence.L6, allTokenTypes.combination.fn);
}

// Fraction
function meetFractionToken(evalContext: EvalContext) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found frac instead");
    evalStacks.evalUntil(evalContext, Precedence.L10);
    if (evalStacks.command.length > 0 && evalStacks.command.last.tokenType === allTokenTypes.frac) {
        if (evalStacks.command.length > 1 && evalStacks.command.raw.at(-2)!.tokenType === allTokenTypes.frac) throwRuntime(RuntimeSyntaxError, iter, "3 Frac not allowed");
        evalStacks.command.push({
            tokenType: allTokenTypes.frac,
            cmd: ({ evalStacks: st }, pre, throwRuntime) => {
                if (pre === Precedence.L10) throw new Error("what? i thought 3 fracs are thrown already");
                // Later frac evaluates first, then negative sign (L8), then this frac
                if (pre >= Precedence.L9) return false;
                if (st.numeric.length < 3) throw new Error("Second frac command expects >=3 elements in the numeric stack");
                st.command.pop();
                st.command.pop();
                const den = st.numeric.popNumber();
                const num = st.numeric.popNumber();
                const int = st.numeric.popNumber();
                if (den === 0) throwRuntime(RuntimeMathError, "Division by 0");
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
            cmd: ({ evalStacks: st }, pre, throwRuntime) => {
                // If another frac appears later (L9), this should not evaluate
                // Later frac evaluates first, then negative sign (L8), then this frac
                if (pre >= Precedence.L9) return false;
                if (st.numeric.length < 2) throw new Error("Frac command expects >=2 elemens in the numeric stack");
                const den = st.numeric.popNumber();
                const num = st.numeric.popNumber();
                if (den === 0) throwRuntime(RuntimeMathError, "Division by 0");
                st.numeric.push(num / den);
                st.command.pop();
                return true;
            },
        });
    }
    evalStacks.numeric.pushPlaceholder();
}

// Power
function meetPowerToken(evalContext: EvalContext) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found power instead");
    evalStacks.evalUntil(evalContext, Precedence.L11);

    evalStacks.command.push({
        tokenType: allTokenTypes.power,
        cmd: ({ evalStacks: st, context }, pre, throwRuntime) => {
            if (pre !== Precedence.comma && pre !== Precedence.closeBracket && pre !== Precedence.lowest) return false;

            if (st.numeric.length < 2) throw new Error("Power command expects >=2 elements in the numeric stack");
            const r = st.numeric.popNumber();
            const l = st.numeric.popNumber();
            st.numeric.push(allTokenTypes.power.fn((msg) => throwRuntime(RuntimeMathError, msg), context, l, r));
            st.command.pop();

            if (pre === Precedence.closeBracket) return false;

            return true;
        },
    });
    evalStacks.numeric.pushPlaceholder();
}

function meetRootToken(evalContext: EvalContext) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found root instead");
    evalStacks.evalUntil(evalContext, Precedence.L11);

    evalStacks.command.push({
        tokenType: allTokenTypes.power,
        cmd: ({ evalStacks: st, context }, pre, throwRuntime) => {
            if (pre !== Precedence.comma && pre !== Precedence.closeBracket && pre !== Precedence.lowest) return false;

            if (st.numeric.length < 2) throw new Error("Root command expects >=2 elements in the numeric stack");
            const r = st.numeric.popNumber();
            const l = st.numeric.popNumber();
            st.numeric.push(allTokenTypes.root.fn((msg) => throwRuntime(RuntimeMathError, msg), context, l, r));
            st.command.pop();

            if (pre === Precedence.closeBracket) return false;

            return true;
        },
    });
    evalStacks.numeric.pushPlaceholder();
}

// Suffix function
function meetSuffixFuncToken(evalContext: EvalContext, tokenType: SuffixFuncTokenType) {
    const { evalStacks, iter, context } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found suffix function instead");
    const fn = tokenType.fn;
    evalStacks.evalUntil(evalContext, Precedence.L11);

    if (evalStacks.numeric.length === 0) throw new Error("Suffix function expects >=1 elements in the numeric stack");
    const x = evalStacks.numeric.popNumber();
    evalStacks.numeric.push(fn((msg) => throwRuntime(RuntimeMathError, iter, msg), context, x));
}

// Parerenthical function
function meetParenFuncToken<ArgNum extends ParenFuncArgNum>(evalContext: EvalContext, tokenType: ParenFuncTokenType<ArgNum>) {
    const { evalStacks, iter, context } = evalContext;
    insertOmittedMul({ evalStacks, iter, context });
    const oriNSLen = evalStacks.numeric.length;
    const argNum = tokenType.argNum;
    const maxArgNum = (argNum instanceof Array) ? Math.max(...argNum) : argNum;
    const fn = tokenType.fn;
    evalStacks.command.push({
        tokenType: tokenType,
        cmd: ({ evalStacks: st }, pre, throwRuntime) => {
            if (pre !== Precedence.comma && pre !== Precedence.closeBracket && pre !== Precedence.lowest) return false;

            const curArgNum = st.numeric.length - oriNSLen;
            if (pre === Precedence.comma && curArgNum !== maxArgNum) return false;

            const isArgNumAcceptable = (argNum instanceof Array) ? argNum.includes(curArgNum) : (curArgNum === argNum);
            if ((pre === Precedence.closeBracket || Precedence.lowest) && !isArgNumAcceptable)
                throwRuntime(RuntimeSyntaxError, "Incorrect number of parenthetical function arguments");

            const args: number[] = [];
            for (let argI = 0; argI < curArgNum; ++argI) {
                args.push(st.numeric.popNumber());
            }
            args.reverse();

            // @ts-expect-error
            // Idk how to make this work lol, but args should be of type ArrayOfLength<number, ArgNum>
            st.numeric.push(fn((msg) => throwRuntime(RuntimeMathError, msg), context, ...args));
            st.command.pop();

            if (pre === Precedence.closeBracket) return false;

            return true;
        },
    });
    evalStacks.numeric.pushPlaceholder();
}
function meetCommaToken(evalContext: EvalContext) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found comma instead");
    evalStacks.evalUntil(evalContext, Precedence.comma);
    if (evalStacks.command.length === 0)
        throwRuntime(RuntimeSyntaxError, iter, "Found comma at top level");
    const lastType = evalStacks.command.last.tokenType;
    if (!(lastType instanceof ParenFuncTokenType || lastType instanceof InfixParenFuncTokenType))
        throwRuntime(RuntimeSyntaxError, iter, "Found comma at top level");
    evalStacks.numeric.pushPlaceholder();
}
function meetCloseBracketToken(evalContext: EvalContext) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found close bracket instead");
    if (!evalStacks.command.raw.some((cmdEl) => cmdEl.tokenType instanceof ParenFuncTokenType || cmdEl.tokenType instanceof InfixFuncTokenType))
        throwRuntime(RuntimeSyntaxError, iter, "Found close bracket at top level");
    evalStacks.evalUntil(evalContext, Precedence.closeBracket);
}

// Main function to evaluate expression
function evaluateExpression(iter: TokenIterator, context: Context = new Context(), isIsolated: boolean = true) {
    const evalStacks = new EvalStacks();

    evalStacks.numeric.pushPlaceholder();

    try {
        const evalContext: EvalContext = { evalStacks, iter, context };

        loop:
        for (; iter.isInBound(); iter.next()) {
            const cur = iter.cur()!;
            switch (cur.type) {
                case allTokenTypes.deg:
                    meetDegreeToken(evalContext);
                    break;
                case allTokenTypes.plus:
                    meetPlusToken(evalContext);
                    break;
                case allTokenTypes.minus:
                    meetMinusToken(evalContext);
                    break;
                case allTokenTypes.neg:
                    meetNegToken(evalContext);
                    break;
                case allTokenTypes.multiply:
                    meetMultiplyToken(evalContext);
                    break;
                case allTokenTypes.divide:
                    meetDivideToken(evalContext);
                    break;
                case allTokenTypes.permutation:
                    meetPermutationToken(evalContext);
                    break;
                case allTokenTypes.combination:
                    meetCombinationToken(evalContext);
                    break;
                case allTokenTypes.frac:
                    meetFractionToken(evalContext);
                    break;
                case allTokenTypes.power:
                    meetPowerToken(evalContext);
                    break;
                case allTokenTypes.root:
                    meetRootToken(evalContext);
                    break;
                case allTokenTypes.comma:
                    meetCommaToken(evalContext);
                    break;
                case allTokenTypes.closeBracket:
                    meetCloseBracketToken(evalContext);
                    break;

                default:
                    if (Object.values(literalTokenTypes).includes(cur.type)) {
                        meetLiteralToken(evalContext);
                    } else if (cur.type instanceof ValuedTokenType) {
                        meetValuedToken(evalContext, cur.type);
                    } else if (cur.type instanceof SuffixFuncTokenType) {
                        meetSuffixFuncToken(evalContext, cur.type);
                    } else if (cur.type instanceof ParenFuncTokenType) {
                        meetParenFuncToken<any>(evalContext, cur.type);
                    } else {
                        if (isIsolated) throwRuntime(RuntimeSyntaxError, iter, "Unsupported token");
                        else break loop;
                    }
            }

            // console.log(evalStacks.numeric, evalStacks.command);
        }
        if (evalStacks.numeric.isPlaceholder()) {
            throwRuntime(RuntimeSyntaxError, iter, "Expect number");
        }
        evalStacks.evalUntil(evalContext, Precedence.lowest);

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
