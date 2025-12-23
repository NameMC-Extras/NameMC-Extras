(() => {

  function CountCommonStrings(ArrayA, ArrayB) {
    let SetB = new Set(ArrayB);
    return new Set(ArrayA.filter(Item => SetB.has(Item))).size;
  }

  function CheckDepthInASWeakMap(Args) {
    if (
      typeof Args[0] !== "object" ||
      CountCommonStrings(
        ["device", "id", "imp", "regs", "site", "source"],
        Object.keys(Args[0])
      ) < 5
    ) return false;

    let ASBannerFrameIdRegExp =
      /^[0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-z0-9-\(\)]+\/[a-zA-Z0-9_]+_slot[0-9]+_+/;

    return !(
      typeof Object.keys(Args[0]).find(
        Arg =>
          typeof Args[0][Arg] === "object" &&
          Array.isArray(Args[0][Arg]) &&
          Args[0][Arg].filter(
            SubArg =>
              typeof SubArg === "object" &&
              Object.keys(SubArg).filter(
                InnerArg =>
                  typeof InnerArg === "string" &&
                  OriginalRegExpTest.call(
                    ASBannerFrameIdRegExp,
                    InnerArg
                  )
              )
          ).length >= 1
      ) > "u"
    );
  }

  const Win = window;
  const OriginalRegExpTest = Win.RegExp.prototype.test;

  function RunTinyShieldUserscript(BrowserWindow, UserscriptName = "tinyShield") {

    const OriginalArrayToString = BrowserWindow.Array.prototype.toString;
    const OriginalRegExpTest2 = BrowserWindow.RegExp.prototype.test;

    const ProtectedFunctionStrings = ["toString", "get", "set"];

    BrowserWindow.Function.prototype.toString = new Proxy(
      BrowserWindow.Function.prototype.toString,
      {
        apply(Target, ThisArg, Args) {
          return ProtectedFunctionStrings.includes(ThisArg.name)
            ? `function ${ThisArg.name}() { [native code] }`
            : Reflect.apply(Target, ThisArg, Args);
        }
      }
    );

    const ASInitPositiveRegExps = [[
      /[a-zA-Z0-9]+ *=> *{ *const *[a-zA-Z0-9]+ *= *[a-zA-Z0-9]+ *; *if/,
      /===? *[a-zA-Z0-9]+ *\[ *[a-zA-Z0-9]+\( *[0-9a-z]+ *\) *\] *\) *return/,
      /inventoryId/
    ]];

    BrowserWindow.Map.prototype.get = new Proxy(
      BrowserWindow.Map.prototype.get,
      {
        apply(Target, ThisArg, Args) {
          if (Args.length && typeof Args[0] !== "function") {
            return Reflect.apply(Target, ThisArg, Args);
          }

          const ArgText = OriginalArrayToString.call(Args);

          if (
            ASInitPositiveRegExps.filter(
              r => r.filter(x => OriginalRegExpTest2.call(x, ArgText)).length >= 2
            ).length === 1
          ) {
            console.debug(`[${UserscriptName}]: Map.prototype.get`, Args);
            throw new Error();
          }

          return Reflect.apply(Target, ThisArg, Args);
        }
      }
    );

    BrowserWindow.Map.prototype.set = new Proxy(
      BrowserWindow.Map.prototype.set,
      {
        apply(Target, ThisArg, Args) {
          let ArgText = "";
          try {
            ArgText = OriginalArrayToString.call(Args);
          } catch {}
          return Reflect.apply(Target, ThisArg, Args);
        }
      }
    );

    BrowserWindow.WeakMap.prototype.set = new Proxy(
      BrowserWindow.WeakMap.prototype.set,
      {
        apply(Target, ThisArg, Args) {
          if (CheckDepthInASWeakMap(Args)) {
            console.debug(`[${UserscriptName}]: WeakMap.prototype.set`, Args);
            throw new Error();
          }
          return Reflect.apply(Target, ThisArg, Args);
        }
      }
    );

    const ASTimerRegExps = [[
      /async *\( *\) *=> *{/,
      /await/,
      /new *Error/
    ]];

    BrowserWindow.setTimeout = new Proxy(
      BrowserWindow.setTimeout,
      {
        apply(Target, ThisArg, Args) {
          if (
            ASTimerRegExps.filter(
              r => r.filter(x => x.test(Args[0].toString())).length >= 3
            ).length === 1
          ) {
            console.debug(`[${UserscriptName}]: setTimeout blocked`);
            return;
          }
          return Reflect.apply(Target, ThisArg, Args);
        }
      }
    );

    BrowserWindow.setInterval = new Proxy(
      BrowserWindow.setInterval,
      {
        apply(Target, ThisArg, Args) {
          if (
            ASTimerRegExps.filter(
              r => r.filter(x => x.test(Args[0].toString())).length >= 3
            ).length === 1
          ) {
            console.debug(`[${UserscriptName}]: setInterval blocked`);
            return;
          }
          return Reflect.apply(Target, ThisArg, Args);
        }
      }
    );
  }

  RunTinyShieldUserscript(Win);

})();
