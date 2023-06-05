type TestCase = () => boolean;
type TestCases = TestCase | TestCases[] | { [name: string]: TestCases };

function testInput(input: string) {
    return () => {
        const { tokens, errorPosition } = lexicalize(input, expressionTokenTypes);
        if (errorPosition.length !== 0) throw new Error("Lexicalization fails");
        return evaluateExpression(tokens);
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
        stack: [
            expect(testInput(limitCmdStack(0) + "3^2"), 9),
            expect(testInput(limitCmdStack(0) + "3^2^2"), 81),
            expect(testInput(limitCmdStack(0) + "3^2!"), 362880),
        ],
    },
    parenFunc: {
        evaluation: [
            expect(testInput("sin(pi div 2)"), 1),
            expect(testInput("sin(pi div 2"), 1),
            expect(testInput("ln(-1)"), RuntimeMathError, 3),
            expect(testInput("ln(-1"), RuntimeMathError, 3),
            expect(testInput("ln(-1,"), RuntimeMathError, 3),
            expect(testInput("log(100"), 2),
            expect(testInput("log(2,8"), 3),
            expect(testInput("log(log(2,1024"), 1),
            expect(testInput("log(log(100),16"), 4),
            expect(testInput("log(log(2,64,7776"), 5),
            // TODO
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
