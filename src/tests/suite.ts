export type TestCase = (() => boolean) | (() => Promise<boolean>);
export type TestCases = TestCase | TestCases[] | { [name: string]: TestCases };


export async function test(cases: TestCases) {
    if (cases instanceof Array) { // []
        for (let i=0; i < cases.length; ++i) {
            console.group(`Test ${i}`);
            await test(cases[i]!);
            console.groupEnd();
        }
    } else if (typeof cases === "object") { // {}
        for (const name in cases) {
            console.group(name);
            await test(cases[name]!);
            console.groupEnd();
        }
    } else if (typeof cases === "function") { // TestCase
        const returned = cases();
        const result = returned instanceof Promise ? await returned : returned;
        if (result) {
            console.log("%cPassed", "color:green");
        } else {
            console.error("%c      Failed!      ", "color:white;background-color:red;font-weight:bold");
        }
    } else {
        throw new Error("???");
    }
}
