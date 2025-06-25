function firstLowerCase(str) {
  if (!str) {
    return str;
  }
  return str.substring(0, 1).toLowerCase() + str.slice(1);
}

function getDateTime() {
  const now = new Date();
  // 补零函数
  const padZero = (num) => num.toString().padStart(2, "0");
  // 年
  const year = now.getFullYear();
  // 月 (注意：getMonth() 返回 0-11)
  const month = padZero(now.getMonth() + 1);
  // 日
  const day = padZero(now.getDate());
  // 时
  const hours = padZero(now.getHours());
  // 分
  const minutes = padZero(now.getMinutes());
  // 秒
  const seconds = padZero(now.getSeconds());

  // 组合成指定格式
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getClassComment(suffix = "") {
  const comment = `/**
 * ${tableInfo.comment}（${moduleName}）${suffix}
 * @author ${author}
 * @since ${currentDatetime}
 */
`;
  return comment;
}

function tableComment(suffix = "") {
  return (tableInfo.comment || "") + suffix;
}

function getModuleName() {
  let name = tableInfo.name;
  if (global.removePrefix && name.startsWith(removePrefix)) {
    name = name.substring(removePrefix.length);
  }

  const strs = name.split("_");
  for (let i = 0; i < strs.length; i++) {
    strs[i] = strs[i].substring(0, 1).toUpperCase() + strs[i].substring(1);
  }
  name = strs.join("");

  return name;
}

function getJavaVarName(fieldName, firstUpper = false) {
  const strs = fieldName.split("_");
  for (let i = firstUpper ? 0 : 1; i < strs.length; i++) {
    strs[i] = strs[i].substring(0, 1).toUpperCase() + strs[i].substring(1);
  }

  return strs.join("");
}

function getJavaShortType(sqlType) {
  return getJavaMapperType(sqlType, true);
}

function getJavaMapperType(sqlType, short = false) {
  sqlType = sqlType.toLowerCase();
  let type = "Object";
  for (const mapper of typeMappers) {
    if (mapper.matchType === "REGEX") {
      const reg = new RegExp(mapper.columnType);
      if (reg.test(sqlType)) {
        type = mapper.javaType;
      }
    } else {
      if (sqlType === mapper.columnType.toLowerCase()) {
        type = mapper.javaType;
      }
    }
  }

  if (short) {
    const index = type.lastIndexOf(".");
    if (index >= 0) {
      type = type.substring(index + 1);
    }
  }

  return type;
}

function getJavaColumnFieldImports() {
  const imports = [];
  for (const column of tableInfo.columns) {
    const type = getJavaMapperType(column.type);
    if (!type.startsWith("java.lang")) {
      imports.push(`import ${type};`);
    }
  }

  return imports.join("\n");
}

function getJavaSetterGetterMethod(column) {
  const shortType = getJavaShortType(column.type);
  const varName = getJavaVarName(column.name);
  const VarName = getJavaVarName(column.name, true);
  const code = `    public void set${VarName}(${shortType} ${varName}) {
        this.${varName} = ${varName};
    }

    public ${shortType} get${VarName}() {
        return this.${varName};
    }
`;

  return code.trimEnd();
}

function onStart() {
  global.moduleName = getModuleName();
  global.firstLowerModuleName = utils.firstLowerCase(moduleName);

  let pk = "";
  const otherColumns = [];
  for (const column of tableInfo.columns) {
    if (column.primaryKey) {
      pk = getJavaVarName(column.name);
    } else {
      otherColumns.push(column);
    }
  }

  tableInfo.otherColumns = otherColumns;
  global.pk = pk;
  global.currentDatetime = getDateTime();
  global.basePackageName = formState.basePackageName;
  global.basePackagePath = formState.basePackageName.replace(/\./g, "/");
  global.subName = formState.subName;
  global.author = formState.author;
}

module.exports = {
  firstLowerCase,
  getDateTime,
  getClassComment,
  tableComment,
  getJavaShortType,
  getJavaVarName,
  getJavaSetterGetterMethod,
  getJavaColumnFieldImports,
  getJavaMapperType,
  onStart,
};
