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

class StackEmptyError<T> extends Error {
    constructor(
        public target: LengthLimitedStack<T>,
        message?: string | undefined,
    ) {
        super(message);
        this.name = "StackEmptyError";
    }
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
type Command = (evalContext: EvalContext, pre: Precedence, throwRuntime: ThrowLocalRuntime) => boolean;
type CommandStackElement = {
    tokenType: TokenType | null,
    cmd: Command
};

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

type EvalContext = {
    evalStacks: EvalStacks,
    iter: TokenIterator,
    context: Context,
};

function acceptLiteral(iter: TokenIterator): number {
    const NEG_TYPE = [ allTokenTypes.minus, allTokenTypes.neg ];
    const POS_TYPE = [ allTokenTypes.plus ];

    function isCurDigit(): boolean {
        return iter.cur()!.type instanceof DigitTokenType;
    }
    function curDigitValue(): number {
        const type = iter.cur()!.type;
        if (type instanceof DigitTokenType) return type.value;
        else throw new Error("Expect digit token type");
    }

    let significand = 0;
    let exp = 0;

    // ((xxxxx)(.xxxxxx))(E(-)xx)

    if (iter.cur()!.type === literalTokenTypes.exp) {
        significand = 1;
    }

    for (; iter.isInBound() && isCurDigit(); iter.next()) {
        significand = significand * 10 + curDigitValue()!;
    }
    // Decimal point
    if (iter.isInBound() && iter.cur()!.type === literalTokenTypes.dot) {
        iter.next();
        for (let j = 1; iter.isInBound() && isCurDigit(); iter.next(), ++j) {
            significand += curDigitValue() * Math.pow(10, -j);
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

        if (!(iter.isInBound() && isCurDigit())) throwRuntime(RuntimeSyntaxError, iter, "Missing number after exp");
        exp = curDigitValue();
        iter.next();

        if (iter.isInBound() && isCurDigit()) {
            exp = exp * 10 + curDigitValue();
            iter.next();

            if (iter.isInBound() && isCurDigit()) throwRuntime(RuntimeSyntaxError, iter, "Exponents cannot have more than 2 numbers");
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


// Helper functions
type InfixFunc = (l: number, r: number, throwMath: ThrowMsg, context: Context) => number;
function handleInfixOperator(evalContext: EvalContext, pre: Precedence, fn: InfixFunc) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found an infix operator instead");
    evalStacks.evalUntil(evalContext, pre);
    evalStacks.command.push({
        tokenType: iter.cur()!.type,
        cmd: binaryCommand(
            pre,
            (l, r, throwRuntime, context) => fn(l, r, (msg) => throwRuntime(RuntimeMathError, msg), context)
        ),
    });
    evalStacks.numeric.pushPlaceholder();
}

function handleInfixParenOperator(evalContext: EvalContext, pre: Precedence, fn: InfixFunc) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found an infix parenthetical operator instead");
    evalStacks.evalUntil(evalContext, pre);

    evalStacks.command.push({
        tokenType: iter.cur()!.type,
        cmd: ({ evalStacks: st, context }, pre, throwRuntime) => {
            if (pre !== Precedence.comma && pre !== Precedence.closeBracket && pre !== Precedence.lowest) return false;

            if (st.numeric.length < 2) throw new Error("Infix parenthetical command expects >=2 elements in the numeric stack");
            const r = st.numeric.popNumber();
            const l = st.numeric.popNumber();
            st.numeric.push(fn(l, r, (msg) => throwRuntime(RuntimeMathError, msg), context));
            st.command.pop();

            if (pre === Precedence.closeBracket) return false;

            return true;
        },
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
function handleValuedToken(evalContext: EvalContext, value: number) {
    const { evalStacks } = evalContext;

    insertOmittedMul(evalContext);
    evalStacks.numeric.push(value);
}
function meetConstantToken(evalContext: EvalContext) {
    const VALUES = new Map<TokenType, number>([
        [allTokenTypes.pi, 3.141_592_653_589_8],
        [allTokenTypes.e, 2.718_281_828_459_04],

        [allTokenTypes.massProton, 1.672_621_777e-27],
        [allTokenTypes.massNeutron, 1.674_927_351e-27],
        [allTokenTypes.massElectron, 9.109_382_91e-31],
        [allTokenTypes.massMuon, 1.883_531_475e-28],

        [allTokenTypes.bohrRadius, 5.291_772_109_2e-11],
        [allTokenTypes.planckConst, 6.626_069_57e-34],
        [allTokenTypes.nuclearMagneton, 5.050_783_53e-27],
        [allTokenTypes.bohrMagneton, 9.274_009_68e-24],

        [allTokenTypes.reducedPlankConst, 1.054_571_726e-34],
        [allTokenTypes.fineStructureConst, 7.297_352_569_8e-3],
        [allTokenTypes.classicalElectronRadius, 2.817_940_326_7e-15],
        [allTokenTypes.comptonWavelength, 2.426_310_238_9e-12],

        [allTokenTypes.protonGyromagnticRatio, 2.675_222_005e-8],
        [allTokenTypes.protonComptonWavelength, 1.321_409_856_23e-15],
        [allTokenTypes.neutronComptonWavelength, 1.319_590_906_8e-15],
        [allTokenTypes.RydbergConst, 1.097_373_156_853_9e7],

        [allTokenTypes.atomicUnitConst, 1.660_538_921e-27],
        [allTokenTypes.protonMagneticMoment, 1.410_606_743e-26],
        [allTokenTypes.electronMagneticMoment, -9.284_764_3e-24],
        [allTokenTypes.neutronMagneticMoment, -9.662_364_7e-27],

        [allTokenTypes.muonMagneticMoment, -9.662_364_7e-27],
        [allTokenTypes.faradayConst, 96_485.336_5],
        [allTokenTypes.elementaryCharge, 1.602_176_565e-19],
        [allTokenTypes.avogadroConst, 6.022_141_29e23],

        [allTokenTypes.boltzmannConst, 1.380_648_8e-23],
        [allTokenTypes.idealGasMolarVolume, 0.022_710_953],
        [allTokenTypes.molarGasConst, 8.314_462_1],
        [allTokenTypes.vacuumLightSpeed, 299_792_458],

        [allTokenTypes.firstRadiationConst, 3.741_771_53e-16],
        [allTokenTypes.secondRadiationConst, 0.014_387_77],
        [allTokenTypes.stefanBoltzmannConst, 5.670_373e-8],
        [allTokenTypes.electricConst, 8.854_187_817e-12],

        [allTokenTypes.magneticConst, 1.256_637_061_4e-6],
        [allTokenTypes.magneticFluxQuantum, 2.067_833_758e-15],
        [allTokenTypes.gravitationalAccel, 9.806_65],
        [allTokenTypes.conductanceQuantum, 7.748_091_734_6e-5],

        [allTokenTypes.characteristicVacuumImpedance, 376.730_313_461],
        [allTokenTypes.celsiusTemperature, 273.15],
        [allTokenTypes.gravitationalConst, 6.673_84e-11],
        [allTokenTypes.atmosphere, 101_325],
    ]);

    const { iter } = evalContext;

    const value = VALUES.get(iter.cur()!.type);
    if (value === undefined) throw new Error("Not a constant token type");

    handleValuedToken(evalContext, value);
}
function meetRanToken(evalContext: EvalContext) {
    const value = Math.floor(Math.random() * 1000) / 1000;
    handleValuedToken(evalContext, value);
}
function meetVariableToken(evalContext: EvalContext) {
    const { iter, context } = evalContext;

    const type = iter.cur()!.type;
    if (!(type instanceof VariableTokenType)) throw new Error("Not a variable token type");
    const value = context.variables[type.varName];

    handleValuedToken(evalContext, value);
}

// Plus, minus and negative
function meetPlusToken({ evalStacks, iter, context }: EvalContext) {
    if (evalStacks.numeric.isPlaceholder()) {
        // nothing happens: more than 24 + does not cause STACK error
    } else {
        handleInfixOperator({ evalStacks, iter, context }, Precedence.L4, (l, r) => l + r);
    }
}
function meetPrefixMinus({ evalStacks }: EvalContext) {
    evalStacks.command.push({
        tokenType: allTokenTypes.neg,
        cmd: unaryCommand(Precedence.L9, (x) => -x),
    });
}
function meetInfixMinus(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L4, (l, r) => l - r);
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

// Normal infix functions
function bool2int(b: boolean) {
    return b ? 1 : 0;
}
function meetEqToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L2, (l, r) => bool2int(l-r === 0));
}
function meetNeqToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L2, (l, r) => bool2int(l-r !== 0));
}
function meetGreaterToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L2, (l, r) => bool2int(l-r > 0));
}
function meetLessToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L2, (l, r) => bool2int(l-r < 0));
}
function meetGeqToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L2, (l, r) => bool2int(l-r >= 0));
}
function meetLeqToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L2, (l, r) => bool2int(l-r <= 0));
}

function meetMultiplyToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L5, (l, r) => l*r);
}
function meetDivideToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L5, (l, r, throwMath) => {
        if (r === 0) throwMath("Division by 0");
        return l/r;
    });
}

function validatePerComArguments(n: number, r: number, throwMath: (msg: string) => void) {
    if (!Number.isInteger(n) || !Number.isInteger(r)) throwMath("n and r in nPr must be integer");
    if (!(0 <= r)) throwMath("r cannot be negative in nPr");
    if (!(r <= n)) throwMath("n must be no less than r in nPr");
    if (!(n < Math.pow(10, 10))) throwMath("n must be less than 10^10 in nPr");
}
function meetPermutationToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L6, (n, r, throwMath) => {
        validatePerComArguments(n, r, throwMath);

        let ans = 1;
        for (let k = 0; k < r; ++k) {
            ans *= n-k;
        }
        return ans;
    });
}
function meetCombinationToken(evalContext: EvalContext) {
    handleInfixOperator(evalContext, Precedence.L6, (n, r, throwMath) => {
        validatePerComArguments(n, r, throwMath);

        let ans = 1;
        for (let k = 0; k < r; ++k) {
            ans = ans * (n-k) / (k+1);
        }
        return ans;
    });
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
    handleInfixParenOperator(evalContext, Precedence.L11, (l, r) => {
        // TODO validation
        return Math.pow(l, r);
    });
}

function meetRootToken(evalContext: EvalContext) {
    handleInfixParenOperator(evalContext, Precedence.L11, (l, r) => {
        // TODO validation
        return Math.pow(r, 1/l);
    });
}

// Suffix function
type ThrowMsg = (msg: string) => never;
type SuffixFunc = (x: number, throwMath: ThrowMsg, context: Context) => number;
const suffixFunctions = new Map<TokenType, SuffixFunc>([
    [allTokenTypes.reciprocal, (x, throwMath) => {
        if (x === 0) throwMath("Division by 0");
        return 1/x;
    }],

    [allTokenTypes.fact, (x, throwMath) => {
        if (!Number.isInteger(x)) throwMath("Cannot take the factorial of a non-integer");
        if (x < 0) throwMath("Cannot take the factorial of a negative value");
        if (x > 69) throwMath("Cannot take the factorial of an integer larger than 69 (too large)");

        let ans = 1;
        for (let k = 2; k <= x; ++k) {
            ans *= k;
        }
        return ans;
    }],

    [allTokenTypes.cube, (x) => Math.pow(x,3)],
    [allTokenTypes.square, (x) => Math.pow(x,2)],

    [allTokenTypes.percentage, (x) => x/100],

    [allTokenTypes.asD, (x, _, context) => x * angleUnitToRad(AngleUnit.Deg) / angleUnitToRad(context.setupSettings.angle)],
    [allTokenTypes.asR, (x, _, context) => x * angleUnitToRad(AngleUnit.Rad) / angleUnitToRad(context.setupSettings.angle)],
    [allTokenTypes.asG, (x, _, context) => x * angleUnitToRad(AngleUnit.Gra) / angleUnitToRad(context.setupSettings.angle)],
]);

function meetSuffixFuncToken(evalContext: EvalContext) {
    const { evalStacks, iter, context } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found suffix function instead");
    const fn = suffixFunctions.get(iter.cur()!.type);
    if (fn === undefined) throw new Error("Not a suffix function token type");
    evalStacks.evalUntil(evalContext, Precedence.L11);

    if (evalStacks.numeric.length === 0) throw new Error("Suffix function expects >=1 elements in the numeric stack");
    const x = evalStacks.numeric.popNumber();
    evalStacks.numeric.push(fn(x, (msg) => throwRuntime(RuntimeMathError, iter, msg), context));
}

type ArrayOfLength<T, N extends number, Arr extends T[] = []> =
    Arr["length"] extends N
    ? Arr | (N extends Arr["length"]
        ? never
        : ArrayOfLength<T, Exclude<N, Arr["length"]>>
    ) : ArrayOfLength<T, N, [T, ...Arr]>

type ParenFuncArgNum = number | number[];
type ParenFunc<ArgNum extends ParenFuncArgNum> =
    ArgNum extends number[]
    ? ParenFunc<ArgNum[number]>
    : (ArgNum extends number
        ? (args: ArrayOfLength<number, ArgNum>, throwMath: ThrowMsg, context: Context) => number
        : never);

type ParenFuncEntry<ArgNum extends ParenFuncArgNum> = [ArgNum, ParenFunc<ArgNum>];

// @ts-expect-error
// I give up
const parenFunctions = new Map<TokenType, ParenFuncEntry<ParenFuncArgNum>>([
    [allTokenTypes.cbrt, <ParenFuncEntry<1>>[1, ([x]) => Math.cbrt(x)]],
    [allTokenTypes.sqrt, <ParenFuncEntry<1>>[1, ([x], throwMath) => {
        if (x < 0) throwMath("Cannot take the square root of negative value");
        return Math.sqrt(x);
    }]],

    [allTokenTypes.log, <ParenFuncEntry<[1,2]>>[[1,2], ([arg2, arg3]: [number, number?], throwMath: ThrowMsg) => {
        if (arg3 === undefined) {
            if (arg2 <= 0) throwMath("Cannot take the log of a non-positive value");
            return Math.log10(arg2);
        } else {
            if (arg2 == 1) throwMath("Base of log cannot be 1");
            if (arg2 <= 0) throwMath("Base of log cannot be non-positive");
            if (arg3 <= 0) throwMath("Cannot take the log of a non-positive value");
            return Math.log(arg3)/Math.log(arg2);
        }
    }]],
    [allTokenTypes.tenExp, <ParenFuncEntry<1>>[1, ([x]) => Math.pow(10, x)]],
    [allTokenTypes.ln, <ParenFuncEntry<1>>[1, ([x], throwMath) => {
        if (x <= 0) throwMath("Cannot take the ln of a non-positive value");
        return Math.log(x)
    }]],
    [allTokenTypes.eExp, <ParenFuncEntry<1>>[1, ([x]) => Math.exp(x)]],

    [allTokenTypes.sin, <ParenFuncEntry<1>>[1, ([x], throwMath, context) => {
        const range: number = {
            [AngleUnit.Deg]: 8_999_999_999.999_92,
            [AngleUnit.Rad]: 157_079_632.679_488,
            [AngleUnit.Gra]: 9_999_999_999.999_90,
        }[context.setupSettings.angle];
        if (Math.abs(x) > range) throwMath(`Cannot take the sin of a value with an absolute value greater than ${range} in this angle unit`);
        return Math.sin(x * angleUnitToRad(context.setupSettings.angle));
    }]],
    [allTokenTypes.asin, <ParenFuncEntry<1>>[1, ([x], throwMath, context) => {
        if (Math.abs(x) > 1) throwMath("Cannot take the arcsin of a value with an absolute value greater than 1");
        return Math.asin(x) / angleUnitToRad(context.setupSettings.angle);
    }]],
    [allTokenTypes.sinh, <ParenFuncEntry<1>>[1, ([x]) => Math.sinh(x)]],
    [allTokenTypes.asinh, <ParenFuncEntry<1>>[1, ([x]) => Math.asinh(x)]],

    [allTokenTypes.cos, <ParenFuncEntry<1>>[1, ([x], throwMath, context) => {
        const range: number = {
            [AngleUnit.Deg]: 8_999_999_999.999_92,
            [AngleUnit.Rad]: 157_079_632.679_488,
            [AngleUnit.Gra]: 9_999_999_999.999_90,
        }[context.setupSettings.angle];
        if (Math.abs(x) > range) throwMath(`Cannot take the cos of a value with an absolute value greater than ${range} in this angle unit`);
        return Math.cos(x * angleUnitToRad(context.setupSettings.angle));
    }]],
    [allTokenTypes.acos, <ParenFuncEntry<1>>[1, ([x], throwMath, context) => {
        if (Math.abs(x) > 1) throwMath("Cannot take the arccos of a value with an absolute value greater than 1");
        return Math.acos(x) / angleUnitToRad(context.setupSettings.angle);
    }]],
    [allTokenTypes.cosh, <ParenFuncEntry<1>>[1, ([x]) => Math.cosh(x)]],
    [allTokenTypes.acosh, <ParenFuncEntry<1>>[1, ([x]) => Math.asinh(x)]],

    [allTokenTypes.tan, <ParenFuncEntry<1>>[1, ([x], throwMath, context) => {
        const range: number = {
            [AngleUnit.Deg]: 8_999_999_999.999_92,
            [AngleUnit.Rad]: 157_079_632.679_488,
            [AngleUnit.Gra]: 9_999_999_999.999_90,
        }[context.setupSettings.angle];
        if (Math.abs(x) > range) throwMath(`Cannot take the tan of a value with an absolute value greater than ${range} in this angle unit`);

        const undefinedAt: number = {
            [AngleUnit.Deg]: 90,
            [AngleUnit.Rad]: 1.570_796_326_794_90,
            [AngleUnit.Gra]: 100,
        }[context.setupSettings.angle];
        const quotient = Math.round(x / undefinedAt);
        if (quotient % 2 === 1) {
            const closest = quotient * undefinedAt;
            if (x - closest === 0) throwMath(`Tan of this value is undefined`);
        }

        return Math.tan(x * angleUnitToRad(context.setupSettings.angle));
    }]],
    [allTokenTypes.atan, <ParenFuncEntry<1>>[1, ([x], _, context) => {
        return Math.atan(x) / angleUnitToRad(context.setupSettings.angle);
    }]],
    [allTokenTypes.tanh, <ParenFuncEntry<1>>[1, ([x]) => Math.tanh(x)]],
    [allTokenTypes.atanh, <ParenFuncEntry<1>>[1, ([x]) => Math.asinh(x)]],

    [allTokenTypes.polar, <ParenFuncEntry<2>>[2, ([x, y], throwMath, context) => {
        if (x === 0 && y === 0) throwMath("Cannot convert (0,0) to polar form");
        context.variables.Y = Math.atan2(y, x) / angleUnitToRad(context.setupSettings.angle);
        return context.variables.X = Math.sqrt(x*x + y*y);
    }]],
    [allTokenTypes.rect, <ParenFuncEntry<2>>[2, ([r, theta], _, context) => {
        const angleInRad = theta * angleUnitToRad(context.setupSettings.angle);
        context.variables.Y = r * Math.sin(angleInRad);
        return context.variables.X = r * Math.cos(angleInRad);
    }]],

    [allTokenTypes.rnd, <ParenFuncEntry<1>>[1, ([x], _, context) => {
        const digits = context.setupSettings.displayDigits.digits;
        switch (context.setupSettings.displayDigits.kind) {
            case DisplayDigitsKind.Fix:
                const pow10 = Math.pow(10, digits);
                return Math.round(x * pow10) / pow10;
            case DisplayDigitsKind.Sci:
                return Number(x.toExponential(digits - 1));
            case DisplayDigitsKind.Norm:
                return Number(x.toExponential(9)); // round to 10 significant figures
        }
    }]],
    [allTokenTypes.abs, <ParenFuncEntry<1>>[1, ([x]) => Math.abs(x)]],

    [allTokenTypes.openBracket, <ParenFuncEntry<1>>[1, ([x]) => x]],
]);

// Parerenthical function
function meetParenFuncToken(evalContext: EvalContext) {
    const { evalStacks, iter, context } = evalContext;
    insertOmittedMul({ evalStacks, iter, context });
    const oriNSLen = evalStacks.numeric.length;
    
    const tokenType = iter.cur()!.type;
    if (!parenFunctions.has(tokenType)) throw new Error("Not a parenthetical function");
    const [argNum, fn] = parenFunctions.get(tokenType)!;
    const maxArgNum = (argNum instanceof Array) ? Math.max(...argNum) : argNum;

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

            // Idk how to make this work lol, but args should be of type ArrayOfLength<number, ArgNum>
            st.numeric.push(fn(args, (msg) => throwRuntime(RuntimeMathError, msg), context));
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
    if (lastType === null || !Object.values(parenTokenTypes).includes(lastType))
        throwRuntime(RuntimeSyntaxError, iter, "Found comma at top level");
    evalStacks.numeric.pushPlaceholder();
}
function meetCloseBracketToken(evalContext: EvalContext) {
    const { evalStacks, iter } = evalContext;
    if (evalStacks.numeric.isPlaceholder()) throwRuntime(RuntimeSyntaxError, iter, "Expect number but found close bracket instead");
    if (!evalStacks.command.raw.some((cmdEl) => cmdEl.tokenType !== null && Object.values(parenTokenTypes).includes(cmdEl.tokenType)))
        throwRuntime(RuntimeSyntaxError, iter, "Found close bracket at top level");
    evalStacks.evalUntil(evalContext, Precedence.closeBracket);
}

type MeetTokenFn = (evalContext: EvalContext) => void;
const meetTokenMap = new Map<TokenType, MeetTokenFn>([
    ...Object.values(digitTokenTypes).map<[TokenType, MeetTokenFn]>((tokenType) => [tokenType, meetLiteralToken]),
    [allTokenTypes.dot, meetLiteralToken],
    [allTokenTypes.exp, meetLiteralToken],
    [allTokenTypes.deg, meetDegreeToken],
    ...Object.values(constantTokenTypes).map<[TokenType, MeetTokenFn]>((tokenType) => [tokenType, meetConstantToken]),
    [allTokenTypes.ran, meetRanToken],
    ...Object.values(variableTokenTypes).map<[TokenType, MeetTokenFn]>((tokenType) => [tokenType, meetVariableToken]),
    [allTokenTypes.plus, meetPlusToken],
    [allTokenTypes.minus, meetMinusToken],
    [allTokenTypes.neg, meetNegToken],
    [allTokenTypes.eq, meetEqToken],
    [allTokenTypes.neq, meetNeqToken],
    [allTokenTypes.greater, meetGreaterToken],
    [allTokenTypes.less, meetLessToken],
    [allTokenTypes.geq, meetGeqToken],
    [allTokenTypes.leq, meetLeqToken],
    [allTokenTypes.multiply, meetMultiplyToken],
    [allTokenTypes.divide, meetDivideToken],
    [allTokenTypes.permutation, meetPermutationToken],
    [allTokenTypes.combination, meetCombinationToken],
    [allTokenTypes.frac, meetFractionToken],
    [allTokenTypes.power, meetPowerToken],
    [allTokenTypes.root, meetRootToken],
    [allTokenTypes.comma, meetCommaToken],
    [allTokenTypes.closeBracket, meetCloseBracketToken],
    ...Object.values(suffixFuncTokenTypes).map<[TokenType, MeetTokenFn]>((tokenType) => [tokenType, meetSuffixFuncToken]),
    ...Object.values(parenFuncTokenTypes).map<[TokenType, MeetTokenFn]>((tokenType) => [tokenType, meetParenFuncToken]),
]);

// Main function to evaluate expression
function evaluateExpression(iter: TokenIterator, context: Context = new Context(), isIsolated: boolean = true) {
    const evalStacks = new EvalStacks();

    evalStacks.numeric.pushPlaceholder();

    try {
        const evalContext: EvalContext = { evalStacks, iter, context };

        loop:
        for (; iter.isInBound(); iter.next()) {
            const cur = iter.cur()!;
            const meetFn = meetTokenMap.get(cur.type);
            if (meetFn === undefined) {
                if (isIsolated) throwRuntime(RuntimeSyntaxError, iter, "Unsupported token");
                else break loop;
            }

            meetFn(evalContext);

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
