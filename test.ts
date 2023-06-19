type TestCase = () => boolean;
type TestCases = TestCase | TestCases[] | { [name: string]: TestCases };

function testInput(input: string, context: Context = defaultContext) {
    return () => {
        const { tokens, errorPosition } = lexicalize(input, expressionTokenTypes);
        if (errorPosition.length !== 0) throw new Error("Lexicalization fails");
        return evaluateExpression(tokens, context);
    };
}
function expectNumber(test: () => number, answer: number): TestCase {
    return () => {
        try {
            const output = test();
            if (output !== answer) {
                console.log(`Expects ${answer} but instead outputs:`, output);
                return false;
            }
            return true;
        } catch (err) {
            console.log(`Expects ${answer} but instead throws error:`, err);
            return false;
        }
    };
}
function expectError(test: () => number, errorType: typeof RuntimeError, tokenI: number): TestCase {
    return () => {
        try {
            const output = test();
            console.log(`Expects ${errorType.name} but instead outputs:`, output);
            return false;
        } catch (err: any) {
            if (err instanceof errorType) {
                if (err.tokenI === tokenI) return true;
                else {
                    console.log(`Expect ${errorType.name} error at token index ${tokenI} but instead it is thrown at ${err.tokenI}`);
                    return false
                }
            } else {
                console.log(`Expects ${errorType.name} error but instead throws ${err.constructor.name} error:`, err);
                return false;
            }
        }
    };
}

function expect(test: () => number, answer: number): TestCase;
function expect(test: () => number, errorType: typeof RuntimeError, tokenI: number): TestCase;
function expect(test: () => number, arg1: number | typeof RuntimeError, arg2?: number): TestCase {
    if (typeof arg1 === "number") {
        return expectNumber(test, arg1);
    } else {
        return expectError(test, arg1, arg2!);
    }
}

function limitNumStack(stackSizeLeft: number) {
    return "1+(".repeat(11 - stackSizeLeft);
}
function limitCmdStack(stackSizeLeft: number) {
    return "(".repeat(24 - stackSizeLeft);
}
function radianContext(): Context {
    return {
        ...defaultContext,
        setupSettings: {
            ...defaultSetupSettings,
            angle: AngleUnit.Rad,
        },
    };
}
function gradianContext(): Context {
    return {
        ...defaultContext,
        setupSettings: {
            ...defaultSetupSettings,
            angle: AngleUnit.Gra,
        },
    };
}
function fixContext(x: IntRange<0, 10>): Context {
    return {
        ...defaultContext,
        setupSettings: {
            ...defaultSetupSettings,
            displayDigits: DisplayDigits.Fix(x),
        },
    };
}
function sciContext(x: IntRange<1, 11>): Context {
    return {
        ...defaultContext,
        setupSettings: {
            ...defaultSetupSettings,
            displayDigits: DisplayDigits.Sci(x),
        },
    };
}
function normContext(x: 1 | 2): Context {
    return {
        ...defaultContext,
        setupSettings: {
            ...defaultSetupSettings,
            displayDigits: DisplayDigits.Norm(x),
        },
    };
}

const allTestCases: TestCases = {
    literal: {
        digits: [
            ...Array(10).fill(0).map((_, i) => expect(testInput(i.toString()), i)),
            expect(testInput("123"), 123),
        ],
        decimal: [
            expect(testInput("."), 0),
            expect(testInput(".12"), 0.12), // fix later
            expect(testInput("56."), 56),
            expect(testInput("123.4567"), 123.4567),
        ],
        exponent: {
            range: [
                expect(testInput("E"), RuntimeSyntaxError, 1),
                expect(testInput("E6"), 1e6),
                expect(testInput("E98"), 1e98),
                expect(testInput("E99"), 1e99),
                expect(testInput("E100"), RuntimeSyntaxError, 3),
                expect(testInput(".5E100"), RuntimeSyntaxError, 5),
                expect(testInput("6E12345"), RuntimeSyntaxError, 4),
            ],
            withSignificand: [
                expect(testInput("34E2"), 3400),
                expect(testInput("34.E2"), 3400),
                expect(testInput("3.4E9"), 34e8),
                expect(testInput(".34E9"), 34e7),
                expect(testInput("56E98"), 56e98),
            ],
            sign: [
                expect(testInput("123E+45"), 123e45),
                expect(testInput("123E-45"), 123e-45),
                expect(testInput("123E-+45"), 123e-45),
                expect(testInput("123E+++45"), 123e45),
                expect(testInput("123E--45"), 123e45),
                expect(testInput("123E---45"), 123e-45),
                expect(testInput("123E+-+++--+45"), 123e-45),
                expect(testInput("123E+++++++++++++++++++++++++++++++++++++++++++++++45"), 123e45),
                expect(testInput("123E-----------------------------------------------45"), 123e-45), // does not overflow command stack
            ],
        },
    },
    degree: {
        commandStack: [
            expect(testInput(limitCmdStack(0) + "2 deg"), 2),
            expect(testInput(limitCmdStack(0) + "2 deg 3"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(0) + "23 deg 45 deg"), RuntimeStackError, 26),
            expect(testInput(limitCmdStack(1) + "23 deg 45 deg"), 23.75),
            expect(testInput(limitCmdStack(1) + "23 deg 45 deg 69"), RuntimeStackError, 28),
            expect(testInput(limitCmdStack(1) + "23 deg 45 deg deg"), RuntimeSyntaxError, 29),
            expect(testInput(limitCmdStack(1) + "23 deg 45 deg 69 deg"), RuntimeStackError, 28),
            expect(testInput(limitCmdStack(2) + "23 deg 44 deg 60 deg"), 23.75),
            expect(testInput(limitCmdStack(2) + "23 deg 44 deg 60 deg 32"), RuntimeSyntaxError, 31),
            expect(testInput(limitCmdStack(2) + "23 deg 44 deg 60 deg deg"), RuntimeSyntaxError, 31),
        ],
        numericStack: [
            expect(testInput(limitNumStack(1) + "6 deg"), 16),
            expect(testInput(limitNumStack(1) + "6 deg deg"), RuntimeSyntaxError, 32),
            expect(testInput(limitNumStack(1) + "6 deg E"), RuntimeStackError, 31),
            expect(testInput(limitNumStack(1) + "6 deg 2E100"), RuntimeStackError, 31),
            expect(testInput(limitNumStack(2) + "6 deg 2E100"), RuntimeSyntaxError, 33),
            expect(testInput(limitNumStack(2) + "6 deg 2E34"), RuntimeSyntaxError, 33),
            expect(testInput(limitNumStack(2) + "6 deg 360 deg"), 21),
            expect(testInput(limitNumStack(2) + "6 deg 360 deg ."), RuntimeStackError, 32),
            expect(testInput(limitNumStack(2) + "6 deg 360 deg 58"), RuntimeStackError, 32),
            expect(testInput(limitNumStack(3) + "6 deg 360 deg ."), RuntimeSyntaxError, 31),
            expect(testInput(limitNumStack(3) + "6 deg 360 deg . deg"), 20),
            expect(testInput(limitNumStack(3) + "6 deg 360 deg 1800 deg"), 20.5),
            expect(testInput(limitNumStack(3) + "6 deg 360 deg 1800 deg 32"), RuntimeSyntaxError, 35),
            expect(testInput(limitNumStack(3) + "6 deg 360 deg 1800 deg ."), RuntimeSyntaxError, 35),
            expect(testInput(limitNumStack(3) + "6 deg 360 deg 1800 deg deg"), RuntimeSyntaxError, 35),
        ],
    },
    valued: {
        constants: [
            expect(testInput("pi"), 3.1415926535898),
            expect(testInput("e"), 2.71828182845904),
            expect(testInput("muB"), 9.274_009_68e-24),
        ],
        omittedMultiplication: [
            expect(testInput("5pi"), 15.707963267949),
            expect(testInput("3E4 pi^2"), 296_088.132_032_682),
        ],
        variables: (() => {
            const context = {
                ...defaultContext,
                variables: {
                    A: 2,
                    B: 3,
                    C: 5,
                    D: 8,
                    X: 13,
                    Y: 69,
                    M: 420, // lmfao github copilot recommends this
                    Ans: 1337,
                },
            };
            return [
                expect(testInput("A", context), 2),
                expect(testInput("B!", context), 6),
                expect(testInput("3C^2", context), 75),
                expect(testInput("cbrt(D)", context), 2),
                expect(testInput("X^2 + Y^3", context), 328678),
                expect(testInput("M%", context), 4.20),
                expect(testInput("Ans", context), 1337),
            ];
        })(),
    },
    plusMinus: {
        prefix: {
            stack: [
                expect(testInput("+".repeat(50) + "3"), 3),
                expect(testInput("-".repeat(24) + "5"), 5),
                expect(testInput("-".repeat(25)), RuntimeStackError, 24),
                expect(testInput("-".repeat(25) + "234"), RuntimeStackError, 24),
                expect(testInput("-".repeat(30)), RuntimeStackError, 24),
                expect(testInput("2+" + "-".repeat(24) + "5"), RuntimeStackError, 25),
                expect(testInput("2+" + "-".repeat(23) + "5"), -3),
                expect(testInput("2-" + "-".repeat(24) + "5"), RuntimeStackError, 25),
                expect(testInput("2-" + "-".repeat(23) + "5"), 7),
                expect(testInput("2-" + "+-+".repeat(23) + "5"), 7),
                expect(testInput("neg".repeat(24) + "5"), 5),
                expect(testInput("neg".repeat(25)), RuntimeStackError, 24),
                expect(testInput("neg".repeat(25) + "234"), RuntimeStackError, 24),
                expect(testInput("neg".repeat(30)), RuntimeStackError, 24),
                expect(testInput("2+" + "neg".repeat(24) + "5"), RuntimeStackError, 25),
                expect(testInput("2+" + "neg".repeat(23) + "5"), -3),
                expect(testInput("2-" + "neg".repeat(24) + "5"), RuntimeStackError, 25),
                expect(testInput("2-" + "neg".repeat(23) + "5"), 7),
                expect(testInput("2-" + "+ neg +".repeat(23) + "5"), 7),
                expect(testInput(limitCmdStack(0) + "1+2"), RuntimeStackError, 25),
                expect(testInput(limitCmdStack(0) + "1-2"), RuntimeStackError, 25),
                expect(testInput(limitCmdStack(0) + "1neg2"), RuntimeSyntaxError, 25),
                expect(testInput(limitCmdStack(1) + "1+2"), 3),
                expect(testInput(limitCmdStack(1) + "1-2"), -1),
                expect(testInput(limitCmdStack(1) + "1-+2"), -1),
                expect(testInput(limitCmdStack(1) + "1--2"), RuntimeStackError, 25),
                expect(testInput(limitCmdStack(1) + "1+2+4"), 7),
                expect(testInput(limitCmdStack(1) + "1+2-4"), -1),
            ],
            evaluation: [
                expect(testInput("+"), RuntimeSyntaxError, 1),
                expect(testInput("-"), RuntimeSyntaxError, 1),
                expect(testInput("neg"), RuntimeSyntaxError, 1),
                expect(testInput("3+"), RuntimeSyntaxError, 2),
                expect(testInput("3-"), RuntimeSyntaxError, 2),
                expect(testInput("3neg"), RuntimeSyntaxError, 1),
                expect(testInput("+3"), 3),
                expect(testInput("+".repeat(12) + "3"), 3),
                expect(testInput("-3"), -3),
                expect(testInput("-".repeat(5) + "5"), -5),
                expect(testInput("-".repeat(8) + "5"), 5),
                expect(testInput("neg 3"), -3),
                expect(testInput("neg ".repeat(5) + "5"), -5),
                expect(testInput("neg ".repeat(8) + "5"), 5),
                expect(testInput("2*+3"), 6),
                expect(testInput("2*+++++3"), 6),
                expect(testInput("2+-3"), -1),
                expect(testInput("-2--8"), 6),
                expect(testInput("neg 2--8"), 6),
                expect(testInput("-2- neg 8"), 6),
                expect(testInput("neg 2- neg 8"), 6),
                expect(testInput("-3*-5"), 15),
                expect(testInput("2neg 8"), RuntimeSyntaxError, 1),
                expect(testInput("-5^2"), -25),
                expect(testInput("neg 5^2"), -25),
            ],
        },
    },
    mulDiv: {
        evaluation: [
            expect(testInput("*3"), RuntimeSyntaxError, 0),
            expect(testInput("div3"), RuntimeSyntaxError, 0),
            expect(testInput("3*"), RuntimeSyntaxError, 2),
            expect(testInput("3div"), RuntimeSyntaxError, 2),
            expect(testInput("*"), RuntimeSyntaxError, 0),
            expect(testInput("div"), RuntimeSyntaxError, 0),
            expect(testInput("3**2"), RuntimeSyntaxError, 2),
            expect(testInput("3div div2"), RuntimeSyntaxError, 2),
            expect(testInput("3* div2"), RuntimeSyntaxError, 2),
            expect(testInput("3div*2"), RuntimeSyntaxError, 2),
            expect(testInput("2*3"), 6),
            expect(testInput("2*3*4"), 24),
            expect(testInput("2*3div4"), 1.5),
            expect(testInput("12div3*4"), 16),
            expect(testInput("12div3div4"), 1),
            expect(testInput("0 div 0"), RuntimeMathError, 3),
            expect(testInput("2 div 0"), RuntimeMathError, 3),
            expect(testInput("2*3 div 0"), RuntimeMathError, 5),
            expect(testInput("2*3 div 0 div 4"), RuntimeMathError, 5),
            expect(testInput("2*3 div 4 div 0"), RuntimeMathError, 7),
            expect(testInput("3^2*4"), 36),
            expect(testInput("3^2 div 4"), 2.25),
            expect(testInput("3*4^2"), 48),
            expect(testInput("3 div 4^2"), 0.1875),
            expect(testInput("4+5*6"), 34),
            expect(testInput("2+8div4"), 4),
            expect(testInput("5*6+4"), 34),
            expect(testInput("8div4+2"), 4),
        ],
        stack: [
            expect(testInput(limitCmdStack(0) + "3*4"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(0) + "3div4"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(1) + "3*4"), 12),
            expect(testInput(limitCmdStack(1) + "3*4*5"), 60),
            expect(testInput(limitCmdStack(1) + "3*5div4"), 3.75),
        ],
    },
    perCom: {
        stack: [
            expect(testInput(limitCmdStack(0) + "3 Per"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(0) + "0 Per"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(0) + "3 Com"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(0) + "0 Com"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(1) + "10 Per 3"), 720),
            expect(testInput(limitCmdStack(1) + "10 Com 3"), 120),
            expect(testInput(limitCmdStack(1) + "6 Per 3 Com 4"), 8_214_570),
            expect(testInput(limitCmdStack(1) + "6^2 Per 3"), 42840),
            expect(testInput(limitCmdStack(1) + "6^2 Com 3"), 7140),
            expect(testInput(limitNumStack(1) + "3 Per"), RuntimeStackError, 31),
            expect(testInput(limitNumStack(1) + "3 Com"), RuntimeStackError, 31),
            expect(testInput(limitNumStack(2) + "10 Per 3"), 729),
            expect(testInput(limitNumStack(2) + "10 Com 3"), 129),
        ],
    },
    fraction: {
        evaluation: [
            expect(testInput("1/2"), 0.5),
            expect(testInput("6/2"), 3),
            expect(testInput("1/3/2"), 2.5),
            expect(testInput("1/0"), RuntimeMathError, 3),
            // TODO: i'm lazy
        ],
        stack: [
            expect(testInput(limitCmdStack(0) + "1/2"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(0) + "1/0"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(1) + "1/2"), 0.5),
            expect(testInput(limitCmdStack(1) + "1/0"), RuntimeMathError, 26),
            expect(testInput(limitCmdStack(1) + "-1/0"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(1) + "neg1/0"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(1) + "1/-2"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(1) + "1/neg2"), RuntimeStackError, 25),
            expect(testInput(limitCmdStack(1) + "1/3/2"), RuntimeStackError, 26),
            expect(testInput(limitCmdStack(1) + "1/0/2"), RuntimeStackError, 26),
            expect(testInput(limitCmdStack(1) + "1/3/0"), RuntimeStackError, 26),
            expect(testInput(limitCmdStack(1) + "1/0/0"), RuntimeStackError, 26),
            expect(testInput(limitCmdStack(2) + "1/3/2"), 2.5),
            // TODO
        ],
    },
    suffix: {
        evaluation: [
            expect(testInput("3^2"), 9),
            expect(testInput("3^2^2"), 81),
            expect(testInput("3%^2"), 0.0009),
            // TODO
        ],
        angleConversion: {
            degreeMode: [
                expect(testInput("90 asD"), 90),
                expect(testInput("pi/2 asR"), 0.027_415_567_780_803_9), // lol
                expect(testInput("(pi/2) asR"), 90),
                expect(testInput("100 asG"), 90),
            ],
            radianMode: [
                expect(testInput("90 asD", radianContext()), 1.570_796_326_794_9),
                expect(testInput("2 asR", radianContext()), 2),
                expect(testInput("100 asG", radianContext()), 1.570_796_326_794_9),
            ],
            gradianMode: [
                expect(testInput("90 asD", gradianContext()), 100),
                expect(testInput("(pi/2) asR", gradianContext()), 100),
                expect(testInput("100 asG", gradianContext()), 100),
            ],
        },
        stack: [
            expect(testInput(limitCmdStack(0) + "3^2"), 9),
            expect(testInput(limitCmdStack(0) + "3^2^2"), 81),
            expect(testInput(limitCmdStack(0) + "3^2!"), 362880),
        ],
    },
    parenFunc: {
        commaBracket: [
            expect(testInput("sin(90)"), 1),
            expect(testInput("sin(90"), 1),
            expect(testInput("ln(-1)"), RuntimeMathError, 3),
            expect(testInput("ln(-1"), RuntimeMathError, 3),
            expect(testInput("ln(-1,"), RuntimeMathError, 3),
            expect(testInput("log(100"), 2),
            expect(testInput("log(2,8"), 3),
            expect(testInput("log(log(2,1024"), 1),
            expect(testInput("log(log(100),16"), 4),
            expect(testInput("log(log(2,64,7776"), 5),
        ],
        roots: [
            expect(testInput("sqrt()"), RuntimeSyntaxError, 1),
            expect(testInput("sqrt(1,2"), RuntimeSyntaxError, 2),
            expect(testInput("sqrt(0)"), 0),
            expect(testInput("sqrt(1)"), 1),
            expect(testInput("sqrt(4)"), 2),
            expect(testInput("sqrt(81)"), 9),
            expect(testInput("sqrt(0.01)"), 0.1),
            // expect(testInput("sqrt(E98)-E49"), 0),
            expect(testInput("sqrt(-9)"), RuntimeMathError, 3),
            expect(testInput("sqrt(--9)"), 3),
            expect(testInput("sqrt(-0.0001)"), RuntimeMathError, 8),
            expect(testInput("cbrt(1,2"), RuntimeSyntaxError, 2),
            expect(testInput("cbrt()"), RuntimeSyntaxError, 1),
            expect(testInput("cbrt(0)"), 0),
            expect(testInput("cbrt(1)"), 1),
            expect(testInput("cbrt(328509)"), 69),
            expect(testInput("cbrt(-74088000)"), -420),
            expect(testInput("cbrt(-0.000001)"), -0.01),
        ],
        log: [
            expect(testInput("log()"), RuntimeSyntaxError, 1),
            expect(testInput("log(1)"), 0),
            expect(testInput("log(10)"), 1),
            expect(testInput("log(1000)"), 3),
            expect(testInput("log(0.00001)"), -5),
            expect(testInput("log(E-78)"), -78),
            expect(testInput("log(0)"), RuntimeMathError, 2),
            expect(testInput("log(-3)"), RuntimeMathError, 3),
            expect(testInput("log(--100)"), 2),
            expect(testInput("log(2,8)"), 3),
            expect(testInput("log(3.14,1)"), 0),
            expect(testInput("log(5,0.04)"), -2),
            expect(testInput("log(0.5,64)"), -6),
            expect(testInput("log(0.2,0.008)"), 3),
            expect(testInput("log(0,3)"), RuntimeMathError, 4),
            expect(testInput("log(3,0)"), RuntimeMathError, 4),
            expect(testInput("log(0,0)"), RuntimeMathError, 4),
            expect(testInput("log(1,3)"), RuntimeMathError, 4),
            expect(testInput("log(-2,9)"), RuntimeMathError, 5),
            expect(testInput("log(-2,-8)"), RuntimeMathError, 6),
            expect(testInput("log(2,-8)"), RuntimeMathError, 5),
            expect(testInput("log(0,0^-1)"), RuntimeMathError, 4),
            expect(testInput("log(1,0^-1)"), RuntimeMathError, 4),
            expect(testInput("log(0,1,2)"), RuntimeMathError, 4),
            expect(testInput("log(2,3,4)"), RuntimeSyntaxError, 4),
            expect(testInput("ln()"), RuntimeSyntaxError, 1),
            expect(testInput("ln(1)"), 0),
            expect(testInput("ln(e)"), 1),
            expect(testInput("ln(2)"), 0.693_147_180_559_946),
            expect(testInput("ln(e^(-12"), -12),
            expect(testInput("ln(e^(-12^2"), -144),
            expect(testInput("ln(-0.01)"), RuntimeMathError, 6),
            expect(testInput("ln(-3)"), RuntimeMathError, 3),
            expect(testInput("ln(--1)"), 0),
            expect(testInput("ln(1,2)"), RuntimeSyntaxError, 2),
            expect(testInput("ln(0,2)"), RuntimeMathError, 2),
        ],
        exponentiation: {
            evaluation: [
                expect(testInput("10^()"), RuntimeSyntaxError, 1),
                expect(testInput("10^(0)"), 1),
                expect(testInput("10^(3)"), 1000),
                expect(testInput("10^(-6)"), 0.000_001),
                expect(testInput("10^(0.5)"), 3.162_277_660_168_38),
                expect(testInput("10^(2,3)"), RuntimeSyntaxError, 2),
                expect(testInput("e^()"), RuntimeSyntaxError, 1),
                expect(testInput("e^(0)"), 1),
                expect(testInput("e^(1)"), 2.718_281_828_459_04),
                expect(testInput("e^(10)"), 22_026.465_794_806_7),
                expect(testInput("e^(-3)"), 0.049_787_068_367_863_8),
                expect(testInput("e^(1,2)"), RuntimeSyntaxError, 2),
            ],
            stack: [
                expect(testInput(limitNumStack(1) + "10^(3"), 1010), // which is different from:
                expect(testInput(limitNumStack(1) + "10 ^(3"), RuntimeStackError, 32),
                expect(testInput(limitNumStack(1) + "e^(3"), 30.085_536_923_187_7), // which is different from:
                expect(testInput(limitNumStack(1) + "e ^(3"), RuntimeStackError, 31),
            ],
        },
        trig: {
            degreeMode: [
                expect(testInput("sin(0)"), 0),
                expect(testInput("sin(90)"), 1),
                expect(testInput("sin(180)"), 0),
                expect(testInput("sin(270)"), -1),
                expect(testInput("sin(-90)"), -1),
                expect(testInput("sin(-245)"), 0.906_307_787_036_652),
                expect(testInput("sin(8999999999.99992)"), 0),
                expect(testInput("sin(8999999999.99993)"), RuntimeMathError, 17),
                expect(testInput("sin(-8999999999.99990)"), 0),
                expect(testInput("asin(0)"), 0),
                expect(testInput("asin(-1)"), -90),
                expect(testInput("asin(1)"), 90),
                expect(testInput("asin(0.5)"), 30),
                expect(testInput("asin(-0.906307787036652)"), -65),
                expect(testInput("asin(-1.01)"), RuntimeMathError, 6),
                expect(testInput("asin(1.01)"), RuntimeMathError, 5),

                expect(testInput("cos(0)"), 1),
                expect(testInput("cos(90)"), 0),
                expect(testInput("cos(180)"), -1),
                expect(testInput("cos(270)"), 0),
                expect(testInput("cos(-90)"), 0),
                expect(testInput("cos(-245)"), -0.422_618_261_740_699),
                expect(testInput("acos(0)"), 90),
                expect(testInput("acos(-1)"), 180),
                expect(testInput("acos(1)"), 0),
                expect(testInput("acos(0.5)"), 60),
                expect(testInput("acos(-0.422618261740699)"), 115),

                expect(testInput("tan(0)"), 0),
                expect(testInput("tan(90)"), RuntimeMathError, 3),
                expect(testInput("tan(180)"), 0),
                expect(testInput("tan(270)"), RuntimeMathError, 4),

                // TODO
            ],
        },
        polRec: (() => {
            function expectOutputXY(input: string, answer: number, x: number, y: number, angleUnit: AngleUnit = AngleUnit.Deg) {
                return () => {
                    const context = {
                        ...defaultContext,
                        variables: {
                            ...defaultVariables,
                        },
                        setupSettings: {
                            ...defaultSetupSettings,
                            angle: angleUnit,
                        },
                    };
                    if (!expect(testInput(input, context), answer)()) return false;
                    if (context.variables.X !== x) {
                        console.log(`Expect variable X to be ${x} but instead X is now:`, context.variables.X);
                        return false;
                    }
                    if (context.variables.Y !== y) {
                        console.log(`Expect variable Y to be ${y} but instead Y is now:`, context.variables.Y);
                        return false;
                    }
                    return true;
                };
            }
            return {
                evaluation: [
                    expect(testInput("Pol(0)"), RuntimeSyntaxError, 2),
                    expect(testInput("Pol(0,0)"), RuntimeMathError, 4),
                    expect(testInput("Pol(1,2,3"), RuntimeSyntaxError, 4),
                    expect(testInput("Pol(0,0,3"), RuntimeMathError, 4),
                    expectOutputXY("Pol(3,0)", 3, 3, 0),
                    expectOutputXY("Pol(0,4)", 4, 4, 90),
                    expectOutputXY("Pol(-5,0)", 5, 5, 180),
                    expectOutputXY("Pol(0,-6)", 6, 6, -90),
                    expectOutputXY("Pol(12,5)", 13, 13, 22.619_864_948_040_3),
                    expectOutputXY("Pol(20,-21)", 29, 29, -46.397_181_027_296_4),
                    expectOutputXY("Pol(-2,-2)", 2.828_427_124_746_19, 2.828_427_124_746_19, -135),
                    expectOutputXY("Pol(-3,4)", 5, 5, 126.869_897_645_844),
                    expect(testInput("Rec(0)"), RuntimeSyntaxError, 2),
                    expect(testInput("Rec(1,2,3"), RuntimeSyntaxError, 4),
                    expectOutputXY("Rec(0,0)", 0, 0, 0),
                    expectOutputXY("Rec(0,234)", 0, 0, 0),
                    expectOutputXY("Rec(3,0)", 3, 3, 0),
                    expectOutputXY("Rec(4,90)", 0, 0, 4),
                    expectOutputXY("Rec(5,180)", -5, -5, 0),
                    expectOutputXY("Rec(6,270)", 0, 0, -6),
                    expectOutputXY("Rec(7,360)", 7, 7, 0),
                    expectOutputXY("Rec(8,-36270)", 0, 0, 8),
                    expectOutputXY("Rec(9,30)", 7.794_228_634_059_95, 7.794_228_634_059_95, 4.5),
                    expectOutputXY("Rec(10,-75)", 2.588_190_451_025_21, 2.588_190_451_025_21, -9.659_258_262_890_68),
                    expectOutputXY("Rec(11,-135)", -7.778_174_593_052_02, -7.778_174_593_052_02, -7.778_174_593_052_02),
                    expectOutputXY("Rec(12,-200)", -11.276_311_449_430_9, -11.276_311_449_430_9, 4.104_241_719_908_01),
                ],
                angleUnits: [
                    expectOutputXY("Pol(0,3)", 3, 3, 90, AngleUnit.Deg),
                    expectOutputXY("Pol(0,3)", 3, 3, 1.570_796_326_794_9, AngleUnit.Rad),
                    expectOutputXY("Pol(0,3)", 3, 3, 100, AngleUnit.Gra),
                ],
            };
        })(),
        rnd: [
            expect(testInput("Rnd(1.23456)", fixContext(3)), 1.235),
            expect(testInput("Rnd(1.23446)", fixContext(3)), 1.234),
            expect(testInput("Rnd(1234.56)", sciContext(3)), 1230),
            expect(testInput("Rnd(1235.56)", sciContext(3)), 1240),
            expect(testInput("Rnd(1234.5678914)", normContext(1)), 1234.567891),
            expect(testInput("Rnd(1234.5678915)", normContext(1)), 1234.567892),
            expect(testInput("Rnd(1234.5678914)", normContext(2)), 1234.567891),
            expect(testInput("Rnd(1234.5678915)", normContext(2)), 1234.567892),
        ],
        stack: [
            expect(testInput("(".repeat(24) + "3"), 3),
            expect(testInput("(".repeat(25) + "3"), RuntimeStackError, 24),
            // TODO
        ],
    },
};

function test(cases: TestCases) {
    if (cases instanceof Array) { // []
        for (let i=0; i < cases.length; ++i) {
            console.group(`Test ${i}`);
            test(cases[i]!);
            console.groupEnd();
        }
    } else if (typeof cases === "object") { // {}
        for (const name in cases) {
            console.group(name);
            test(cases[name]!);
            console.groupEnd();
        }
    } else if (typeof cases === "function") { // TestCase
        if (cases()) {
            console.log("%cPassed", "color:green");
        } else {
            console.error("%c      Failed!      ", "color:white;background-color:red;font-weight:bold");
        }
    } else {
        throw new Error("???");
    }
}

function testAll() {
    test(allTestCases);
}

testAll();
