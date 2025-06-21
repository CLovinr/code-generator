import {
  TYPE_CONTENT,
  TYPE_LOCAL,
  TYPE_GLOBAL,
  TYPE_SET,
  TYPE_CONFIG,
  Lexer2,
} from "./lexer";
import path from "path";
import fs from "fs";
import vm from "node:vm";

function doListFileRecursive(pathStr: string, list: string[]) {
  if (!fs.existsSync(pathStr)) {
    return;
  }
  let stat = fs.statSync(pathStr);
  if (stat.isFile()) {
    list.push(pathStr);
  } else {
    let files = fs.readdirSync(pathStr);
    files.forEach((item) =>
      doListFileRecursive(path.join(pathStr, item), list)
    );
  }
}

let exeIdCount = 0;

function genScript(
  baseOutDir: string,
  lexer2: Lexer2,
  globalContextMap: any,
  currentFile: string,
  includeDeep: number,
  includeSuffix: string,
  encoding: string,
  extraOptions: any
) {
  const scriptLocalQueue = [];
  const scriptGlobalQueue = [];

  const __code_gen_bridge__ = {
    content: {} as any,
    getContent(id: string) {
      let value = this.content[id];
      return value;
    },
  };

  let outPath =
    path.join(
      baseOutDir,
      path.basename(currentFile, path.extname(currentFile))
    ) + ".txt";
  let write = true;
  let execute = undefined;
  for (let i = 0; i < lexer2.length; i++) {
    const item = lexer2.getItem(i);
    const valId = "let-" + exeIdCount++;

    switch (item.type) {
      case TYPE_CONTENT:
        {
          let currentContent = item.value;
          const lastItem = lexer2.getItem(i - 1);
          if (
            lastItem &&
            [TYPE_LOCAL, TYPE_GLOBAL, TYPE_CONFIG].includes(lastItem.type) &&
            currentContent.startsWith("\n")
          ) {
            currentContent = currentContent.substring(1); // 去掉一个换行
          }

          __code_gen_bridge__.content[valId] = currentContent;
          scriptLocalQueue.push(
            'out.print(__code_gen_bridge__.getContent("' + valId + '"));'
          );
        }
        break;
      case TYPE_LOCAL:
        {
          scriptLocalQueue.push(item.value);
        }
        break;
      case TYPE_GLOBAL: //全局脚本
        {
          scriptGlobalQueue.push(item.value);
        }
        break;
      case TYPE_SET:
        {
          const keyName = item.value;
          scriptLocalQueue.push("out.print(" + keyName + ");");
        }
        break;
      case TYPE_CONFIG:
        {
          const attrs = item.value;
          for (const name in attrs) {
            let attrValue = attrs[name];
            if (typeof attrValue === "string") {
              attrValue = attrValue.trim();
            }

            if (attrValue) {
              //处理属性
              let strPast = "";
              while (true) {
                const rs = /\$\{\s*([a-zA-Z0-9_.$-]+)\s*\}/.exec(attrValue);
                if (rs) {
                  let varName = rs[1];
                  strPast += attrValue.substring(0, rs.index);
                  strPast +=
                    globalContextMap[varName] === undefined ||
                    globalContextMap[varName] === null
                      ? ""
                      : globalContextMap[varName];
                  attrValue = attrValue.substring(rs.index + rs[0].length);
                } else {
                  strPast += attrValue;
                  break;
                }
              }
              attrValue = strPast;
            }

            const rs = /^$\{\s*([a-zA-Z0-9_.$-]+)\s*\}$/.exec(attrValue);
            if (rs) {
              attrValue = globalContextMap[rs[1]];
            }

            if (attrValue === null || attrValue === undefined) {
              console.warn("attr " + name + " is empty:file=" + currentFile);
              continue;
            }
            switch (name) {
              case "out": //设置输出文件
                outPath = path.join(baseOutDir, attrValue);
                break;
              case "write":
                if (
                  attrValue === "false" ||
                  attrValue === false ||
                  attrValue === "0"
                ) {
                  write = false;
                } else {
                  write = true;
                }
                break;
              case "execute":
                if (
                  attrValue === "false" ||
                  attrValue === false ||
                  attrValue === "0"
                ) {
                  execute = false;
                } else {
                  execute = true;
                }
                break;
              case "include": //导入子模板
                if (includeDeep > 50) {
                  throw new Error("include stack overflow:" + includeDeep);
                } else {
                  let includePath = _getPath(
                    extraOptions.tplDir + path.sep + "includes",
                    attrValue +
                      (path.extname(attrValue as string) === includeSuffix
                        ? ""
                        : includeSuffix)
                  );

                  if (!fs.existsSync(includePath)) {
                    includePath = _getPath(
                      extraOptions.configDir +
                        path.sep +
                        "common" +
                        path.sep +
                        "includes",
                      attrValue +
                        (path.extname(attrValue as string) === includeSuffix
                          ? ""
                          : includeSuffix)
                    );
                  }

                  if (!fs.existsSync(includePath)) {
                    extraOptions.log("include file not exists：" + includePath);
                  } else {
                    const rs = _exeScript(
                      baseOutDir,
                      includePath,
                      globalContextMap,
                      includeDeep,
                      includeSuffix,
                      encoding,
                      extraOptions
                    );

                    if (rs.write) {
                      __code_gen_bridge__.content[valId] = rs.content;
                      scriptLocalQueue.push(
                        'out.print(__code_gen_bridge__.getContent("' +
                          valId +
                          '"));'
                      );
                    }
                  }
                }
                break;
            }
          }
        }
        break;
    }
  }

  execute = execute === undefined || (write ? write : execute);

  const buffers: any[] = [];
  if (execute) {
    const outFunc = {
      print(...objs: any[]) {
        for (let i = 0; i < objs.length; i++) {
          buffers.push(objs[i]);
        }
      },
      println(...objs: any[]) {
        this.print.apply(this, objs);
        buffers.push("\n");
      },
    };

    globalContextMap.out = outFunc;
    globalContextMap.__code_gen_bridge__ = __code_gen_bridge__;

    const options: vm.RunningScriptOptions = {
      timeout: 60 * 1000,
    };

    const globalCode = scriptGlobalQueue.join("\n").trim();
    if (globalCode) {
      //执行 全局脚本
      const ctx = vm.createContext(globalContextMap);

      const script = new vm.Script(globalCode);
      script.runInContext(ctx, options);
    }

    const localContextMap: any = {};
    for (const key in globalContextMap) {
      localContextMap[key] = globalContextMap[key];
    }

    delete globalContextMap.out;
    delete globalContextMap.__code_gen_bridge__;

    //执行局部脚本
    const localCode = scriptLocalQueue.join("\n");

    const ctx = vm.createContext(localContextMap);
    const script = new vm.Script(localCode);
    script.runInContext(ctx, options);

    for (const key in globalContextMap) {
      globalContextMap[key] = localContextMap[key];
    }
  }

  return {
    content: buffers.join(""),
    out: outPath,
    write: write,
    execute: execute,
  };
}

function _getPath(base: string, pathStr: string) {
  if (!pathStr) {
    return base;
  }
  pathStr = pathStr.replace("/", path.sep);
  if (pathStr.charAt(0) === path.sep || pathStr.indexOf(":") > 0) {
    return pathStr;
  } else {
    return path.resolve(base, pathStr);
  }
}

function _exeScript(
  baseOutDir: string,
  file: string,
  globalContextMap: any,
  includeDeep: number,
  includeSuffix: string,
  encoding: string,
  extraOptions: {
    configDir: string;
    tplDir: string;
    log: any;
  }
) {
  const str: any = fs.readFileSync(file, {
    encoding: encoding as any,
  });

  const lexer2 = new Lexer2(str as string);
  lexer2.analyze();

  const rs = genScript(
    baseOutDir,
    lexer2,
    globalContextMap,
    file,
    includeDeep + 1,
    includeSuffix,
    encoding,
    extraOptions
  );

  return rs;
}

const TPL = {
  getPath: _getPath,
  exeScript(
    baseOutDir: string,
    file: string,
    globalContextMap: any,
    includeSuffix: string,
    encoding: string,
    extraOptions: {
      configDir: string;
      tplDir: string;
      log: any;
    }
  ) {
    return _exeScript(
      baseOutDir,
      file,
      globalContextMap,
      0,
      includeSuffix,
      encoding,
      extraOptions
    );
  },
  listFileRecursive(dir: string) {
    let as: string[] = [];
    doListFileRecursive(dir, as);
    return as;
  },
};

export default TPL;
