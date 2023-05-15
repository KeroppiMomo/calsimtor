const prompt = require("prompt-sync")({ sigint: true });

class Entry {
    constructor(x, y, freq) {
        this.x = x;
        this.y = y;
        this.freq = freq;
    }
}

var reg, entries;
function initialize() {
    reg = {
        a: 0,
        b: 0,
        c: 0,
        d: 0,
        x: 0,
        y: 0,
        m: 0,
    };
    entries = [new Entry(0,0,0)];
}
initialize();

function DT(x, y, freq) {
    if (x == undefined) x = entries[entries.length-1].x;
    if (y == undefined) y = entries[entries.length-1].y;
    if (freq == undefined) freq = 1;
    entries.push(new Entry(x,y,freq));
}

const data = {
    sum: (f) => {
        return entries.reduce((prev, cur) => prev + f(cur), 0);
    },
    get n() {
        return data.sum((e) => e.freq);
    },
    get sum_y() {
        return data.sum((e) => e.freq*e.y);
    },
    get sum_y2() {
        return data.sum((e) => e.freq*Math.pow(e.y,2));
    },
    get sum_x() {
        return data.sum((e) => e.freq*e.x);
    },
    get sum_x2() {
        return data.sum((e) => e.freq*Math.pow(e.x,2));
    },
    get sum_x3() {
        return data.sum((e) => e.freq*Math.pow(e.x,3));
    },
    get sum_x4() {
        return data.sum((e) => e.freq*Math.pow(e.x,4));
    },
    get sum_xy() {
        return data.sum((e) => e.freq*e.x*e.y);
    },
    get sum_x2y() {
        return data.sum((e) => e.freq*Math.pow(e.x,2)*e.y);
    },
    regression: {
        S: (f1, f2) => {
            return data.sum((e) => f1(e)*f2(e)*e.freq) - data.sum((e) => f1(e)*e.freq) * data.sum((e) => f2(e)*e.freq) / data.n;
        },
        get a() {
            return (data.sum_y - data.regression.b * data.sum_x - data.regression.c * data.sum_x2) / data.n;
        },
        get b() {
            const S = data.regression.S;
            const ex = (e) => e.x;
            const ex2 = (e) => e.x*e.x;
            const ey = (e) => e.y;
            return (S(ex,ey)*S(ex2,ex2) - S(ex2,ey)*S(ex,ex2)) / (S(ex,ex)*S(ex2,ex2) - S(ex,ex2)*S(ex,ex2));
        },
        get c() {
            const S = data.regression.S;
            const ex = (e) => e.x;
            const ex2 = (e) => e.x*e.x;
            const ey = (e) => e.y;
            return (S(ex2,ey)*S(ex,ex) - S(ex,ey)*S(ex,ex2)) / (S(ex,ex)*S(ex2,ex2) - S(ex,ex2)*S(ex,ex2));
        },
        x1: (y) => {
            const r = data.regression;
            if (r.c == 0) throw new Error("division by 0");
            const dis = r.b*r.b - 4*r.c*(r.a-y);
            return (-r.b+Math.sqrt(dis)) / (2*r.c);
        },
        x2: (y) => {
            const r = data.regression;
            if (r.c == 0) throw new Error("division by 0");
            const dis = r.b*r.b - 4*r.c*(r.a-y);
            if (dis < 0) throw new Error("sqrt negative");
            return (-r.b-Math.sqrt(dis)) / (2*r.c);
        },
        y: (x) => {
            const r = data.regression;
            return r.a + r.b*x + r.c*x*x;
        },
    },
};

function program(input, output) {
    DT(undefined, undefined, 0);
    reg.a = input();
    reg.b = input();
    reg.c = input();
    reg.d = input();
    if (reg.a) {
        reg.x = input();
        DT(undefined, undefined, reg.x);
        reg.x = input();
        reg.y = input();
        reg.m = input();
    } else {
        reg.x = reg.b;
        reg.y = reg.c;
        reg.m = reg.d;
        reg.a = input();
        reg.b = input();
        reg.c = input();
        reg.d = input();
    }
    if (data.n) {
        reg.x = reg.a*reg.x - reg.b*data.n;
        reg.y = reg.a*reg.y - reg.c*data.n;
        reg.m = reg.a*reg.m - reg.d*data.n;
        // output(reg.x);
        // output(reg.y);
        // output(reg.m);
    }
    DT(undefined, undefined, reg.b*reg.y*reg.y + 2*reg.a*reg.x*reg.m - reg.c*reg.x*reg.y - data.n);
    DT(reg.a*(reg.y*reg.y + reg.x*reg.x));
    DT(1, data.sum_x + data.n - 1);
    DT(2, 4*data.sum_x + 2*data.n - 8);
    DT(data.sum_x-3, 0, -1);
    DT(0, undefined, 3-data.n)
    reg.a = reg.c*reg.m*reg.y - reg.a*reg.m*reg.m - reg.d*reg.y*reg.y;
    // output(data.regression.c);
    // output(data.regression.b);
    // output(-reg.a);
    reg.b = data.regression.x1(reg.a);
    reg.c = reg.b + data.regression.x2(reg.a);
    while (true) {
        output(reg.b = reg.c - reg.b);
        output(-(reg.m + reg.x*reg.b) / reg.y);
    }
}

function stdin() {
    return parseInt(prompt("input: "));
}
function stdout(output) {
    console.log(output);
    prompt();
}

class TestCaseFailedError extends Error {
    constructor(expected, actual) {
        super(`Test case failed: should be ${expected} but got ${actual}`);
        this.expected = expected;
        this.actual = actual;
    }
}

function consume(arr) {
    let i = 0;
    return () => arr[i++];
}
class EndOfDataError extends Error { }
function expectConsume(arr, eps=1e-10) {
    let i = 0;
    return (output) => {
        if (i < arr.length) {
            if (!isFinite(output) || Math.abs(arr[i] - output) > eps) {
                throw new TestCaseFailedError(arr[i], output);
            }
            i++;
        } else {
            throw new EndOfDataError();
        }
    };
}

class TestCase {
    constructor(input, output) {
        this.input = input;
        this.output = output;
    }

    test(program) {
        try {
            initialize();
            program(consume(this.input), expectConsume(this.output));
        } catch (error) {
            if (!(error instanceof EndOfDataError)) {
                console.error(error.message);
            } else {
                console.log("# Test case passed");
            }
        }
    }
}

const testCases = [
    new TestCase([1, -4, -3.25, 0, 1, -11, -5, 28], [3, 4, 4, 0]),
    new TestCase([2, 2, -26, 56, 1, -4, -8, 18], [1, 3, 3, 5]),
    new TestCase([1, 0, -10, 20, 1, -4, -10, 28], [2, 4, 2, 6]),
    new TestCase([1, -4, -3.25, 0, 0, 4, 1, -16], [3, 4, 4, 0]),
    new TestCase([0, 4, 1, -16, 1, -4, -3.25, 0], [3, 4, 4, 0]),
    new TestCase([1, -4, -3.25, 0, 0, 4, 0, -16], [4, 0, 4, 3.25]),
    new TestCase([1, -4, -3.25, 0, 4, 0, 0, -16], [1, 4, 3, 4]),
];
// program(consume(testCases[0].input), stdout);
for (const testCase of testCases) {
    testCase.test(program);
}
console.log("Test completed");
