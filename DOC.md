# Documentation

This document describes some detailed workings of the CASIO fx-50FH II calculator.

## Numerical precision and auto-correction
As described in the manual, numbers in the calculator have a precision of 15 significant figures.
More precisely, a number is represented by a base-10 floating point value $\pm \mathrm{A.BCDEFGHIJKLMNO} \times 10^n$,
where `A` is an integer between 1 and 9, `B` through `O` are integers between 0 to 9, and `n` is an integer between -99 and 99.

Besides, the calculator has an auto-correction mechanism, as observed [here on WebCal](http://webcal.freehostia.com/3650P/correct1.htm).
It attempts to correct for precision errors by rounding off the answer if it is close to a "round value".
- Auto-correction is triggered after performing each mathematical operation, but before the adjustment of the exponent `n` to make the most significant digit `A` non-zero.

    This means literal numbers (directly typing the number using the 0 to 9 symbols) are not subject to auto-correction.
    For example, `123456789.010005` would be auto-corrected to `123456789.010000` according to rules below.
    `sin(123456789.010000)` and `sin(--123456789.010005)` give the same answer (`-0.156 606 846` in DEG mode),
    but `sin(123456789.010005)` give a different answer (`-0.156 606 933`).
    This is because auto-correction is trigger after mathematical operations, in this case the two negation operations (`-`).

- Rules for auto-correction:
    - If $0 \leq \mathrm{LMNO} \leq 9$, then round down to 11 significant figures (i.e. set `O` to be 0).
    - If $9991 \leq \mathrm{LMNO} \leq 9999$, then round up to 11 significant figures (i.e. increment `K`, and set `L`, `M`, `N`, `O` to be 0).
    - If the first 13 significant digits are zero (i.e. $\mathrm{A} = \mathrm{B} = \ldots = \mathrm{M} = 0$), then the number is corrected to be zero (i.e. set `N`, `O` to be 0).

<details>
<summary>Observations to support this theory</summary>

- Square brackets here mean literal numbers
    - `[0.8 + 1E-15] + 1E-11 - 0.8 = 1E-11`
    - `[0.8 + 1E-15] + 1E-12 - 0.8 = 1.001E-12`
    - `[0.8 + 1E-14] + 0.01 - 0.8 - 0.01 = 1E-14`
    - `[0.8 + 1E-14] + 0.1 - 0.8 - 0.1 = 0`
    - `[0.8 + 1E-14] + 0.1 + 0.01 - 0.8 - 0.01 - 0.1 = 0`
    - `[0.8 + 1E-14] + 0.1 + 0.01 - 0.8 - 0.1 - 0.01 = 1E-14`
- X = pi/10 or e/10:
    - `X - (X - E-15 - E-3) - E-3 = 1E-15`
    - `X - (X - E-15 - E-2) - E-2 = 0`
    - `X - (X - E-14 - E-2) - E-2 = 1E-14`
    - `X - (X - E-14 - E-1) - E-1 = 0`
- in DEG mode:
    - 123456789.010005 → 123456789.010000
        - `sin(123456789.010000)` = -0.156 606 846
        - `sin(123456789.010005)` = -0.156 606 933
        - `sin(--123456789.010005)` = -0.156 606 846
    - 123456789.019990 → X
        - `sin(123456789.019990)` = -0.156 779 051
        - `sin(123456789.020000)` = -0.156 779 223
        - `sin(--123456789.019990)` = -0.156 779 051
    - 123456789.019991 → X
        - `sin(123456789.019991)` = -0.156 779 068
        - `sin(123456789.020000)` = -0.156 779 223
        - `sin(--123456789.019990)` = -0.156 779 223
    - 123456789.012005 → X
        - `sin(123456789.012000)` = -0.156 641 322
        - `sin(123456789.012005)` = -0.156 641 408
        - `sin(--123456789.012005)` = -0.156 641 408
    - 100000000.000045 → X
        - `sin(100000000.000000)` = -0.984 807 753
        - `sin(100000000.000045)` = -0.984 807 616
        - `sin(--100000000.000045)` = -0.984 807 616
    - 100000000.000010 → X
        - `sin(100000000.000000)` = -0.984 807 753
        - `sin(100000000.000010)` = -0.984 807 722
        - `sin(--100000000.000010)` = -0.984 807 722
    - 100000000.000009 → 100000000.000000
        - `sin(100000000.000000)` = -0.984 807 753
        - `sin(100000000.000009)` = -0.984 807 725
        - `sin(--100000000.000009)` = -0.984 807 753
    - 100000000.000001 + 0.001 → 100000000.001001
        - `sin(100000000.001000)`= -0.984 804 722
        - `sin(100000000.001001)`= -0.984 804 719
        - `sin(100000000.000001 + 0.001)`= -0.984 804 719
    - 100000000.000001 + 0.01 → 100000000.010000
        - `sin(100000000.010000)`= -0.984 777 430
        - `sin(100000000.010001)`= -0.984 777 427
        - `sin(100000000.000001 + 0.01)`= -0.984 777 430
    - 100000000.000000 + 0.000010 → 100000000.000010
        - `sin(100000000.000000)`= -0.984 807 753
        - `sin(100000000.000010)`= -0.984 807 722
        - `sin(100000000.000000 + 0.000010)`= -0.984 807 722
    - So there should be a separate mechanism for 0
    - 123456789.012340 - 123456789.012240 → 0.01, 123456789.012340 - 123456789.012241 → 0
        - `log(123456789.012340 - 123456789.012331)` MATH Error
        - `log(123456789.012340 - 123456789.012330)` MATH Error
        - `log(123456789.012340 - 123456789.012241)` MATH Error
        - `log(123456789.012340 - 123456789.012240)` = -4

</details>

Numerical precision and auto-correction have not yet been implemented in calsimtor.

## Numeric and command stacks
When evaluating an expression, the calculator does not parse the whole expression first before evaluation
(which is not feasible from a memory allocation standpoint).
Instead, it simply evaluates the expression from left to right,
and stores unused data in the numeric and command stacks,
as described in the manual.
The numeric stack has a size of 10 and the command stack has a size of 24.
Pushing values into a full stack results in a STACK Error.

For example, the numeric and command stacks during the evaluation of `7 + log(6div2, sin(40^2))` is shown below.

| Numeric stack            | Expect number | Command stack           |
| ------------------------ | ------------- | ----------------------- |
| `[7]` | `false` | `[]` |
| `[7]` | `true` | `["+"]` |
| `[7]` | `true` | `["+","log("]` |
| `[7,6]` | `false` | `["+","log("]` |
| `[7,6]` | `true` | `["+","log(","÷"]` |
| `[7,6,2]` | `false` | `["+","log(","÷"]` |
| `[7,3]` | `true` | `["+","log("]` |
| `[7,3]` | `true` | `["+","log(","sin("]` |
| `[7,3,40]` | `false` | `["+","log(","sin("]` |
| `[7,3,1600]` | `false` | `["+","log(","sin("]` |
| `[7,3,0.3420201433256694]` | `false` | `["+","log("]` |
| `[7,-0.9765825998010816]` | `false` | `["+"]` |
| `[6.023417400198919]` | `false` | `[]` |

Several interesting points to note:
- Decimal point (`.`) and scientific notation (`E` by using the "EXP" key) are not commands;
    they are a part of parsing literal numbers.
- Suffix functions (e.g. `^2`, `%`, angle unit conversions like `ʳ`) do not push into the command stack.
- How fractions (`┘`) work is quite interesting.

P.S. In my implementation, "expect number" is represented by a placeholder value in the numeric stack,
so I set the numeric stack size to be 11.

## `Ans` and hidden memory
When interpreting a calculator program, there are two memory values that seem similar,
namely the variable `Ans` and the ["hiddle memory"](http://webcal.freetzi.com/casio.fx-50FH/tech11.htm) (`value` in my implementation).
However they have subtle differences:
- The calculator always displays `value` (e.g. when using `◢` or at the end of the program).
- Prompts (`?`) store the input value into `value`, not `Ans`.
- Results of an expression are stored in both `Ans` and `value`.

For example for the program `?→A`, after inputting `42`, the program displays `42` and `Ans` is not altered.

## Conditional jump (`⇒`)
In a program, an expression can be followed by the conditional jump token (`⇒`).
1. The expression preceding `⇒` is evaluated.
2. If the expression evaluates to `0`, the statement after `⇒` is not executed. More precisely:
    1. The calculator first checks if the token immediately after `⇒` is permitted.
        Notable allowed tokens include `?`, `Lbl `, ` To ` and ` Step `.
    2. Then it ignores the tokens ahead until the separator token `:`, the display token `◢` or the end of the program is reached.
    3. If the display token `◢` is reached _and_ the program ends immediately afterwards, then the calculator displays `0`.
    4. Execution continues afterwards.
3. Otherwise, execution continues, and only expressions, setup commands, `?`, `Goto `, `Lbl ` and `Break` are allowed afterwards.

For example, intriguingly the program `0⇒ Step While For IfEnd:` runs without throwing SYNTAX error!

## Unconditional jump (`Lbl ` and `Goto `)
`Lbl ` and `Goto ` only accept one digit token (`0` to `9`) as the label; expressions are not allowed.
An ARGUMENT error will be thrown if one digit token does not follow `Lbl ` or `Goto `.

The calculator does nothing when it finds a `Lbl ` token except
throwing SYNTAX error if the token following it is not a digit.

`Goto [x]` jumps to the _first position_ in the program where `Lbl [x]` is found,
or if `Lbl [x]` does not exist, throws a GOTO error.

For example the program `0⇒Lbl 19◢ 10◢ Lbl 1: 11◢ Goto 1: 12` displays `10`, then displays `11`, then throws ARGUMENT error.

## `If ` and `While `
I have not figured out how exactly `If ` and `While ` work yet.
Here are some test programs if you would like to investigate.

<details>
<summary>Test programs</summary>

- `If 1 disp Then Lbl 9 disp 2 disp IfEnd disp If 3 disp Then Goto 9 disp` syntax error the second time at `IfEnd`
- `If 1 disp Then Goto 8 disp Lbl 9 disp IfEnd disp Lbl 8 disp Goto 9 disp` syntax error at `IfEnd`
- `If 1 disp Then Goto 8 disp Lbl 9 disp IfEnd disp Lbl 8 disp Goto 9 disp` syntax error at `IfEnd`
- `If 1 disp Then 2 disp Goto 9 disp Lbl 9 disp IfEnd` no error
- `If 1 disp Then 2 disp Goto 9 disp IfEnd Lbl 9 disp IfEnd` error at second `IfEnd`
- `If 1 disp Then 2 disp Goto 9 disp If IfEnd Lbl 9 disp IfEnd` no error
- `If 1 disp Then 2 disp Goto 9 disp If If If IfEnd Lbl 9 disp IfEnd` no error
- `If 1 disp Then 2 disp Goto 9 disp If IfEnd IfEnd If Lbl 9 disp IfEnd` error at second `IfEnd`
- `If 1 disp Then 2 disp Goto 9 disp If IfEnd IfEnd IfEnd Lbl 9 disp IfEnd` error at second `IfEnd`
- `If 1 disp Then 2 disp Goto 9 disp IfEnd If Lbl 9 disp IfEnd` error at second `IfEnd`
- `If 1 disp Then 2 disp Goto 9 disp IfEnd IfEnd IfEnd If Lbl 9 disp IfEnd` error at second `IfEnd`
- `If 1 disp Then 2 disp Goto 9 disp If Lbl 9 disp IfEnd` no error
- `If 1 disp Then 2 disp Goto 9 disp Then Lbl 9 disp IfEnd` no error

- `If 1 disp Then 2 disp If 123` syntax error at second `If`
- `If 1 disp Then 2 disp Goto 9 disp Lbl 9 disp If 123` syntax error at second `If`
- `If 1 disp Then Goto 8 disp Lbl 9 disp If 123 Lbl 8 disp Goto 9 disp` syntax error at second `If`

- `Goto 9: If 1: Then Lbl 9: IfEnd` error at IfEnd -> the way context changes is different when jumping

- jump while not in if -> if is allowed

- `1 -> X: 90 disp While X: 90 disp 0 => 2WhileEnd disp 92 disp 0 => 2WhileEnd: 93 disp 0 -> X: WhileEnd: 94 disp` outputs 90, 91, 92, 93, WhileEnd, 92, 93, syntax error
- `2→X: 90◢ While X: 91◢ If 0: Then WhileEnd: 92◢ While 1: 69◢ WhileEnd: IfEnd: 93◢ X-1→X: WhileEnd: 94◢`
- `2→X: 90◢ While X: 91◢ If 0: Then 92◢ While 1: 69◢ WhileEnd: IfEnd: 93◢ X-1→X: WhileEnd: 94◢` syntax error at second While

</details>
